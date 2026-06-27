import { MoyasarPaymentProvider } from './moyasar.provider';

describe('MoyasarPaymentProvider', () => {
  const originalSecret = process.env.MOYASAR_WEBHOOK_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.MOYASAR_WEBHOOK_SECRET;
    } else {
      process.env.MOYASAR_WEBHOOK_SECRET = originalSecret;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('accepts Moyasar webhooks only when secret_token matches', async () => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'moyasar-secret';
    const provider = new MoyasarPaymentProvider();

    const result = await provider.verifyWebhook({
      id: 'evt-1',
      type: 'payment_paid',
      secret_token: 'moyasar-secret',
      data: {
        id: 'pay-1',
        invoice_id: 'inv-1',
        status: 'paid',
        amount: 5000,
        currency: 'sar',
        metadata: { paymentDueId: 'due-id' },
      },
    });

    expect(result).toEqual({
      isValid: true,
      eventId: 'evt-1',
      transactionId: 'inv-1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 5000,
      currency: 'SAR',
    });
  });

  it('rejects Moyasar webhooks with the wrong secret_token', async () => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'moyasar-secret';
    const provider = new MoyasarPaymentProvider();

    await expect(
      provider.verifyWebhook({ secret_token: 'wrong', data: { id: 'pay-1' } }),
    ).resolves.toEqual({ isValid: false });
  });
});
