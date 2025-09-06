import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor(private env: Env) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(params: {
    amount: number;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const credits = Math.floor(params.amount / 25);
    const bonusCredits = this.calculateBonusCredits(params.amount);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: 'PixelForge Credits',
            description: `${credits + bonusCredits} credits (${credits} base + ${bonusCredits} bonus)`,
          },
          unit_amount: params.amount * 100, // Convert to paise
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.userEmail,
      metadata: {
        user_id: params.userId,
        base_credits: credits.toString(),
        bonus_credits: bonusCredits.toString(),
      },
    });

    return session.url!;
  }

  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.env.STRIPE_WEBHOOK_SECRET
    );
  }

  private calculateBonusCredits(amount: number): number {
    if (amount >= 5000) return 50;      // ₹5000+ gets 50 bonus
    if (amount >= 2500) return 15;      // ₹2500+ gets 15 bonus
    if (amount >= 1000) return 5;       // ₹1000+ gets 5 bonus
    return 0;
  }
}
