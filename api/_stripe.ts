import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY não foi configurada nas variáveis de ambiente.');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }
  return stripeInstance;
}

export const STRIPE_PRICES = {
  consultorio: process.env.STRIPE_PRICE_CONSULTORIO || 'price_1UNdpA5TwZ1eJBy2ztuDc9r7',
  ilimitado: process.env.STRIPE_PRICE_ILIMITADO || 'price_1UNdt25TwZ1eJBy2D4zVC5u4',
  consultorio_eur: process.env.STRIPE_PRICE_CONSULTORIO_EUR || 'price_1UNds25TwZ1eJBy295MMOFo1',
  ilimitado_eur: process.env.STRIPE_PRICE_ILIMITADO_EUR || 'price_1UNdu05TwZ1eJBy2JsmQp0Hb',
};

