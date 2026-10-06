import { getStripe, STRIPE_PRICES } from './_stripe.js';
import { getDb } from './_firebase.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable: any): Promise<Buffer> {
  if (readable.rawBody) {
    return Buffer.isBuffer(readable.rawBody) ? readable.rawBody : Buffer.from(readable.rawBody);
  }
  if (Buffer.isBuffer(readable.body)) {
    return readable.body;
  }
  if (typeof readable.body === 'string') {
    return Buffer.from(readable.body);
  }
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of readable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
  } catch {
    // Ignora erro se stream já tiver sido lida
  }
  if (chunks.length > 0) {
    return Buffer.concat(chunks);
  }
  if (readable.body && typeof readable.body === 'object') {
    return Buffer.from(JSON.stringify(readable.body));
  }
  return Buffer.concat(chunks);
}

function resolvePlanFromPriceId(priceId: string): 'consultorio' | 'ilimitado' {
  if (priceId === STRIPE_PRICES.consultorio || priceId === STRIPE_PRICES.consultorio_eur) return 'consultorio';
  if (priceId === STRIPE_PRICES.ilimitado || priceId === STRIPE_PRICES.ilimitado_eur) return 'ilimitado';
  return 'consultorio';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const stripe = getStripe();
  const { db } = getDb();

  let event: any;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Se STRIPE_WEBHOOK_SECRET ainda não estiver configurado (fase inicial de teste)
      event = JSON.parse(rawBody.toString('utf8'));
      console.warn('⚠️ Webhook processado sem verificação de assinatura (STRIPE_WEBHOOK_SECRET não configurado)');
    }
  } catch (err: any) {
    console.error('❌ Erro na validação do webhook da Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Evento recebido da Stripe: ${event.type}`);

  try {
    switch (event.type) {
      // 1. Checkout concluído com sucesso
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const userEmail = session.customer_details?.email || session.metadata?.userEmail;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.warn('Checkout concluído sem userId identificado:', session.id);
          break;
        }

        let plan: 'consultorio' | 'ilimitado' = 'consultorio';
        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        let cancelAtPeriodEnd = false;

        if (subscriptionId) {
          const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items?.data?.[0]?.price?.id || '';
          plan = (session.metadata?.plan as any) || resolvePlanFromPriceId(priceId);
          if (subscription.current_period_end) {
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
          cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        }

        const profileRef = db.collection('profiles').doc(userId);
        await profileRef.set(
          {
            isTrial: false,
            subscription: {
              plan,
              status: 'active',
              currentPeriodEnd,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              cancelAtPeriodEnd,
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        );

        // Garantir que caso o sistema use authorized_emails, o e-mail também seja registrado
        if (userEmail) {
          const emailDoc = db.collection('authorized_emails').doc(userEmail.toLowerCase().trim());
          await emailDoc.set(
            {
              active: true,
              plan,
              stripeCustomerId: customerId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }

        console.log(`✅ Assinatura ativada para usuário ${userId} (${userEmail}) no plano ${plan}!`);
        break;
      }

      // 2. Renovação mensal aprovada (Invoice paga com sucesso)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        const customerId = invoice.customer as string;

        if (!subscriptionId) break;

        const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items?.data?.[0]?.price?.id || '';
        const plan = resolvePlanFromPriceId(priceId);

        // Buscar usuário pelo stripeCustomerId ou stripeSubscriptionId
        const profilesQuery = await db
          .collection('profiles')
          .where('subscription.stripeCustomerId', '==', customerId)
          .get();

        if (!profilesQuery.empty) {
          const batch = db.batch();
          profilesQuery.forEach((doc: any) => {
            batch.update(doc.ref, {
              'subscription.status': 'active',
              'subscription.plan': plan,
              'subscription.currentPeriodEnd': currentPeriodEnd,
              'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
              'subscription.updatedAt': new Date().toISOString(),
              isTrial: false,
            });
          });
          await batch.commit();
          console.log(`✅ Renovação confirmada para cliente ${customerId}. Válido até ${currentPeriodEnd}`);
        }
        break;
      }

      // 3. Atualização na assinatura (Ex: cancelamento agendado, troca de cartão ou troca de plano)
      case 'customer.subscription.updated': {
        const subscription: any = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items?.data?.[0]?.price?.id || '';
        const plan = resolvePlanFromPriceId(priceId);
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : new Date().toISOString();

        let status = subscription.status; // 'active', 'past_due', 'canceled', etc.

        const profilesQuery = await db
          .collection('profiles')
          .where('subscription.stripeCustomerId', '==', customerId)
          .get();

        if (!profilesQuery.empty) {
          const batch = db.batch();
          profilesQuery.forEach((doc: any) => {
            batch.update(doc.ref, {
              'subscription.status': status,
              'subscription.plan': plan,
              'subscription.currentPeriodEnd': currentPeriodEnd,
              'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
              'subscription.updatedAt': new Date().toISOString(),
            });
          });
          await batch.commit();
          console.log(`🔄 Assinatura atualizada para cliente ${customerId}. Status: ${status}`);
        }
        break;
      }

      // 4. Assinatura cancelada definitivamente
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const profilesQuery = await db
          .collection('profiles')
          .where('subscription.stripeCustomerId', '==', customerId)
          .get();

        if (!profilesQuery.empty) {
          const batch = db.batch();
          profilesQuery.forEach((doc: any) => {
            batch.update(doc.ref, {
              'subscription.status': 'canceled',
              'subscription.plan': 'free',
              'subscription.updatedAt': new Date().toISOString(),
            });
          });
          await batch.commit();
          console.log(`⚠️ Assinatura cancelada definitivamente para cliente ${customerId}.`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Evento ${event.type} não requer ação.`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`❌ Erro ao processar evento ${event.type}:`, error);
    return res.status(500).json({ error: 'Erro ao processar webhook da Stripe.' });
  }
}
