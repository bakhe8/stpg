import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import {
  IPaymentGateway,
  PaymentIntentOptions,
  PaymentIntentResult,
  WebhookVerificationResult,
} from '../interfaces/payment-gateway.interface';

type MoyasarWebhookPayload = {
  id?: string;
  type?: string;
  secret_token?: string;
  data?: MoyasarPaymentData;
  invoice_id?: string;
  status?: string;
  metadata?: Record<string, string>;
  amount?: number;
  currency?: string;
};

type MoyasarPaymentData = {
  id?: string;
  invoice_id?: string;
  status?: string;
  metadata?: Record<string, string>;
  amount?: number;
  currency?: string;
};

type MoyasarInvoiceResponse = {
  id?: string;
  url?: string;
  status?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

@Injectable()
export class MoyasarPaymentProvider implements IPaymentGateway {
  private readonly logger = new Logger(MoyasarPaymentProvider.name);

  async createPaymentIntent(
    options: PaymentIntentOptions,
  ): Promise<PaymentIntentResult> {
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      return this.createMockOrThrow(options);
    }

    this.logger.log(
      `[Moyasar] Creating payment intent for amount: ${options.amount} ${options.currency}`,
    );

    const body = new URLSearchParams({
      amount: this.toMinorUnit(options.amount).toString(),
      currency: options.currency.toUpperCase(),
      description: options.description ?? 'CollectiveTrustOS payment',
    });
    const callbackUrl =
      options.callbackUrl ||
      process.env.MOYASAR_CALLBACK_URL ||
      process.env.PAYMENT_CALLBACK_URL;
    if (callbackUrl) body.set('callback_url', callbackUrl);
    for (const [key, value] of Object.entries(options.metadata ?? {})) {
      body.set(`metadata[${key}]`, value);
    }

    const response = await fetch(`${this.apiBaseUrl()}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(options.idempotencyKey
          ? { 'Idempotency-Key': options.idempotencyKey }
          : {}),
      },
      body,
    });
    const json = (await response.json()) as MoyasarInvoiceResponse;

    if (!response.ok || !json.id) {
      throw new ServiceUnavailableException(
        json.error?.message ??
          json.message ??
          'Moyasar invoice creation failed',
      );
    }

    return {
      id: json.id,
      paymentUrl: json.url,
      status: json.status ?? 'created',
    };
  }

  private createMockOrThrow(
    options: PaymentIntentOptions,
  ): Promise<PaymentIntentResult> {
    void options;
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('MOYASAR_SECRET_KEY is not set');
    }

    const mockId = `moyasar_intent_${Date.now()}`;

    return Promise.resolve({
      id: mockId,
      paymentUrl: `https://mock.moyasar.com/pay/${mockId}`,
      status: 'initiated',
    });
  }

  verifyWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    void signature;
    this.logger.log(`[Moyasar] Verifying webhook`);
    const event = this.toMoyasarEvent(payload);
    const expectedSecret =
      process.env.MOYASAR_WEBHOOK_SECRET ??
      process.env.MOYASAR_WEBHOOK_SECRET_TOKEN;

    if (!expectedSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'MOYASAR_WEBHOOK_SECRET is not set',
        );
      }
    } else if (!this.constantTimeEquals(event.secret_token, expectedSecret)) {
      return Promise.resolve({ isValid: false });
    }

    const payment = event.data ?? event;
    const gatewayStatus = payment.status ?? event.status;
    const eventType = event.type ?? '';
    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (gatewayStatus === 'paid' || eventType.includes('paid')) {
      status = 'SUCCESS';
    } else if (
      gatewayStatus === 'failed' ||
      gatewayStatus === 'canceled' ||
      eventType.includes('failed')
    ) {
      status = 'FAILED';
    }

    return Promise.resolve({
      isValid: true,
      eventId: event.id,
      transactionId: payment.invoice_id ?? payment.id ?? event.invoice_id,
      status,
      metadata: payment.metadata || {},
      amountMinor: payment.amount,
      currency: payment.currency?.toUpperCase(),
    });
  }

  private toMoyasarEvent(payload: unknown): MoyasarWebhookPayload {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as MoyasarWebhookPayload;
      } catch {
        return {};
      }
    }

    return typeof payload === 'object' && payload !== null ? payload : {};
  }

  private constantTimeEquals(actual: string | undefined, expected: string) {
    if (!actual) return false;
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private apiBaseUrl() {
    return process.env.MOYASAR_API_BASE_URL ?? 'https://api.moyasar.com/v1';
  }

  private toMinorUnit(amount: number): number {
    return Math.round(amount * 100);
  }
}
