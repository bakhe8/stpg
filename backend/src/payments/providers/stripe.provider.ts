import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  IPaymentGateway,
  PaymentIntentOptions,
  PaymentIntentResult,
  WebhookVerificationResult,
} from '../interfaces/payment-gateway.interface';

type StripeWebhookPayload = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      metadata?: Record<string, string>;
      amount?: number;
      currency?: string;
    };
  };
};

type StripePaymentIntentResponse = {
  id?: string;
  client_secret?: string;
  status?: string;
  error?: {
    message?: string;
  };
};

@Injectable()
export class StripePaymentProvider implements IPaymentGateway {
  private readonly logger = new Logger(StripePaymentProvider.name);

  async createPaymentIntent(
    options: PaymentIntentOptions,
  ): Promise<PaymentIntentResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return this.createMockOrThrow(options);
    }

    this.logger.log(
      `[Stripe] Creating payment intent for amount: ${options.amount} ${options.currency}`,
    );

    const body = new URLSearchParams({
      amount: this.toMinorUnit(options.amount).toString(),
      currency: options.currency.toLowerCase(),
      automatic_payment_methods: JSON.stringify({ enabled: true }),
    });
    if (options.description) body.set('description', options.description);
    for (const [key, value] of Object.entries(options.metadata ?? {})) {
      body.set(`metadata[${key}]`, value);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-02-25.clover',
    };
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers,
      body,
    });
    const json = (await response.json()) as StripePaymentIntentResponse;

    if (!response.ok || !json.id) {
      throw new ServiceUnavailableException(
        json.error?.message ?? 'Stripe payment intent creation failed',
      );
    }

    return {
      id: json.id,
      clientSecret: json.client_secret,
      status: json.status ?? 'created',
    };
  }

  private createMockOrThrow(
    options: PaymentIntentOptions,
  ): Promise<PaymentIntentResult> {
    void options;
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('STRIPE_SECRET_KEY is not set');
    }

    const mockId = `pi_${Date.now()}`;
    const mockClientSecret = `${mockId}_secret_mock`;

    return Promise.resolve({
      id: mockId,
      clientSecret: mockClientSecret,
      status: 'requires_payment_method',
    });
  }

  verifyWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    this.logger.log(`[Stripe] Verifying webhook`);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'STRIPE_WEBHOOK_SECRET is not set',
        );
      }
      return Promise.resolve(this.parseWebhookPayload(payload));
    }

    if (typeof payload !== 'string' || !signature) {
      return Promise.resolve({ isValid: false });
    }

    if (!this.verifyStripeSignature(payload, signature, webhookSecret)) {
      return Promise.resolve({ isValid: false });
    }

    return Promise.resolve(this.parseWebhookPayload(payload));
  }

  private parseWebhookPayload(payload: unknown): WebhookVerificationResult {
    const event = this.toStripeEvent(payload);
    const type = event.type;
    const object = event.data?.object;

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (type === 'payment_intent.succeeded') status = 'SUCCESS';
    else if (type === 'payment_intent.payment_failed') status = 'FAILED';

    return {
      isValid: true,
      eventId: event.id,
      transactionId: object?.id,
      status,
      metadata: object?.metadata || {},
      amountMinor: object?.amount,
      currency: object?.currency?.toUpperCase(),
    };
  }

  private toStripeEvent(payload: unknown): StripeWebhookPayload {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as StripeWebhookPayload;
      } catch {
        return {};
      }
    }

    return typeof payload === 'object' && payload !== null ? payload : {};
  }

  private verifyStripeSignature(
    rawPayload: string,
    signatureHeader: string,
    secret: string,
  ): boolean {
    const parts = signatureHeader.split(',');
    const timestamp = parts
      .find((part) => part.startsWith('t='))
      ?.slice('t='.length);
    const signatures = parts
      .filter((part) => part.startsWith('v1='))
      .map((part) => part.slice('v1='.length));

    if (!timestamp || signatures.length === 0) return false;
    const timestampNumber = Number(timestamp);
    if (
      !Number.isFinite(timestampNumber) ||
      Math.abs(Date.now() / 1000 - timestampNumber) > 300
    ) {
      return false;
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');

    return signatures.some((candidate) =>
      this.constantTimeHexEquals(candidate, expected),
    );
  }

  private constantTimeHexEquals(candidate: string, expected: string): boolean {
    try {
      const candidateBuffer = Buffer.from(candidate, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');
      return (
        candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer)
      );
    } catch {
      return false;
    }
  }

  private toMinorUnit(amount: number): number {
    return Math.round(amount * 100);
  }
}
