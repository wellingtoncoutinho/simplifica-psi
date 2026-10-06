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
    const { userEmail, returnOrigin } = body;
    const origin = returnOrigin || 'https://www.simplepsi.com';

    let customerId: string | undefined = undefined;

    if (userEmail) {
      try {
        const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existing.data.length > 0) {
          customerId = existing.data[0].id;
        }
      } catch (custErr) {
        console.warn('Erro ao consultar cliente na Stripe:', custErr);
      }
    }

    if (!customerId) {
      return sendJson(res, 400, { 
        error: 'Nenhuma assinatura ou cartão foi encontrado na Stripe para este e-mail. Para gerenciar seu plano, assine primeiro um dos planos disponíveis!' 
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/`,
    });

    return sendJson(res, 200, { url: portalSession.url });
  } catch (err: any) {
    console.error('Erro ao criar sessão do portal da Stripe:', err);
    return sendJson(res, 500, { error: err.message || 'Erro ao carregar o portal da Stripe' });
  }
}
