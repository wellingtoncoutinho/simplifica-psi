import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function') {
    const s = res.status(status);
    if (s && typeof s.json === 'function') return s.json(data);
  }
  if (typeof res.json === 'function') {
    res.statusCode = status;
    return res.json(data);
  }
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
  if (typeof res.end === 'function') {
    return res.end(JSON.stringify(data));
  }
}

export default async function handler(req: any, res: any) {
  // CORS headers
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return typeof res.end === 'function' ? res.end() : (typeof res.send === 'function' ? res.send() : null);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { plan, userId, userEmail, returnOrigin, country } = body;

    if (!plan || (plan !== 'consultorio' && plan !== 'ilimitado')) {
      return sendJson(res, 400, { error: 'Plano inválido. Escolha "consultorio" ou "ilimitado".' });
    }

    const isPortugal = country === 'PT';
    const priceId = isPortugal
      ? (plan === 'consultorio' 
          ? (process.env.STRIPE_PRICE_CONSULTORIO_EUR || 'price_1UNds25TwZ1eJBy295MMOFo1')
          : (process.env.STRIPE_PRICE_ILIMITADO_EUR || 'price_1UNdu05TwZ1eJBy2JsmQp0Hb'))
      : (plan === 'consultorio' 
          ? (process.env.STRIPE_PRICE_CONSULTORIO || 'price_1UNdpA5TwZ1eJBy2ztuDc9r7')
          : (process.env.STRIPE_PRICE_ILIMITADO || 'price_1UNdt25TwZ1eJBy2D4zVC5u4'));

    const origin = returnOrigin || 'https://www.simplepsi.com';

    // Procura customer existente pelo e-mail
    let customerId: string | undefined = undefined;
    if (userEmail) {
      try {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        }
      } catch (custErr) {
        console.warn('Erro ao buscar customer existente na Stripe:', custErr);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId,
      customer_email: customerId ? undefined : (userEmail || undefined),
      client_reference_id: userId || userEmail || undefined,
      metadata: {
        userId: userId || '',
        userEmail: userEmail || '',
        plan: plan,
        country: isPortugal ? 'PT' : 'BR',
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          userEmail: userEmail || '',
          plan: plan,
          country: isPortugal ? 'PT' : 'BR',
        },
      },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&checkout=success&plan=${plan}&country=${isPortugal ? 'PT' : 'BR'}`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      locale: isPortugal ? 'pt' : 'pt-BR',
    });

    return sendJson(res, 200, { url: session.url });
  } catch (err: any) {
    console.error('Erro ao criar sessão de checkout Stripe:', err);
    return sendJson(res, 500, { error: err.message || 'Erro ao comunicar com a Stripe' });
  }
}
