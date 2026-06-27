import { createHmac } from 'node:crypto';
import { StripePaymentProvider } from './stripe.provider';

describe('StripePaymentProvider', () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('accepts webhooks only when the Stripe signature matches the raw payload', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const provider = new StripePaymentProvider();
    const payload = JSON.stringify({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          amount: 12500,
          currency: 'sar',
          metadata: { paymentDueId: 'due-id' },
        },
      },
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const digest = createHmac('sha256', 'whsec_test')
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const result = await provider.verifyWebhook(
      payload,
      `t=${timestamp},v1=${digest}`,
    );

    expect(result).toEqual({
      isValid: true,
      eventId: 'evt_1',
      transactionId: 'pi_1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 12500,
      currency: 'SAR',
    });
  });

  it('rejects Stripe webhooks with an invalid signature', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const provider = new StripePaymentProvider();

    await expect(
      provider.verifyWebhook(
        '{"type":"payment_intent.succeeded"}',
        't=123,v1=bad',
      ),
    ).resolves.toEqual({ isValid: false });
  });
});
