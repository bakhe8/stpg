export interface PaymentIntentOptions {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  description?: string;
  callbackUrl?: string;
}

export interface PaymentIntentResult {
  id: string; // The gateway's session/intent ID
  clientSecret?: string; // Used for frontend SDKs (e.g., Stripe client_secret)
  paymentUrl?: string; // Used for redirects (e.g., Moyasar hosted payment page)
  status: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  transactionId?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
  metadata?: Record<string, string>;
  amount?: number;
}

export interface IPaymentGateway {
  createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult>;
  verifyWebhook(payload: any, signature?: string): Promise<WebhookVerificationResult>;
}

export const MOYASAR_PROVIDER = 'MOYASAR_PROVIDER';
export const STRIPE_PROVIDER = 'STRIPE_PROVIDER';
