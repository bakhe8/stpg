import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntentDto, GatewayProvider } from './dto/create-intent.dto';
import {
  STRIPE_PROVIDER,
  MOYASAR_PROVIDER,
} from './interfaces/payment-gateway.interface';
import type {
  IPaymentGateway,
  WebhookVerificationResult,
} from './interfaces/payment-gateway.interface';
import { PaymentMethod, PaymentRecordStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_PROVIDER) private readonly stripeProvider: IPaymentGateway,
    @Inject(MOYASAR_PROVIDER) private readonly moyasarProvider: IPaymentGateway,
  ) {}

  private getProvider(provider: GatewayProvider): IPaymentGateway {
    if (provider === GatewayProvider.STRIPE) return this.stripeProvider;
    if (provider === GatewayProvider.MOYASAR) return this.moyasarProvider;
    throw new BadRequestException('Unsupported payment provider');
  }

  private getPaymentMethod(provider: GatewayProvider): PaymentMethod {
    return provider === GatewayProvider.STRIPE
      ? PaymentMethod.STRIPE
      : PaymentMethod.MOYASAR;
  }

  async createIntent(userId: string, dto: CreateIntentDto) {
    const due = await this.prisma.paymentDue.findUnique({
      where: { id: dto.paymentDueId },
      include: {
        subscription: {
          include: {
            membership: { select: { personId: true, entityId: true } },
          },
        },
      },
    });

    if (!due) throw new NotFoundException('PaymentDue not found');
    if (due.status === 'PAID') throw new BadRequestException('Already paid');
    if (due.subscription.membership.personId !== userId) {
      throw new ForbiddenException(
        'PaymentDue does not belong to current user',
      );
    }

    const provider = this.getProvider(dto.provider);
    const paymentMethod = this.getPaymentMethod(dto.provider);
    const intentResult = await provider.createPaymentIntent({
      amount: due.amountDue.toNumber(),
      currency: 'SAR',
      description: `Subscription due ${due.periodLabel}`,
      metadata: {
        paymentDueId: due.id,
        userId,
      },
      callbackUrl:
        process.env.PAYMENT_CALLBACK_URL ?? process.env.FRONTEND_PUBLIC_URL,
      idempotencyKey: `payment_due:${due.id}:${dto.provider}`,
    });

    await this.prisma.paymentRecord.upsert({
      where: { gatewayTransactionId: intentResult.id },
      create: {
        subscriptionId: due.subscriptionId,
        paymentDueId: due.id,
        submittedById: userId,
        amount: due.amountDue,
        reference: intentResult.id,
        status: PaymentRecordStatus.PROCESSING,
        paymentMethod,
        gatewayTransactionId: intentResult.id,
      },
      update: {
        amount: due.amountDue,
        reference: intentResult.id,
        status: PaymentRecordStatus.PROCESSING,
      },
    });

    return intentResult;
  }

  async handleWebhook(
    providerName: GatewayProvider,
    payload: unknown,
    signature?: string,
  ) {
    const provider = this.getProvider(providerName);
    const verification = await provider.verifyWebhook(payload, signature);

    if (!verification.isValid || !verification.transactionId) {
      return {
        success: false,
        reason: 'Invalid signature or missing transactionId',
      };
    }

    // Find the processing record
    const record = await this.prisma.paymentRecord.findUnique({
      where: { gatewayTransactionId: verification.transactionId },
    });

    if (!record) {
      return { success: false, reason: 'Record not found' };
    }

    const validationError = this.validateWebhookPayment(record, verification);
    if (validationError) {
      return { success: false, reason: validationError };
    }

    if (verification.status === 'PENDING') {
      return { success: true, status: 'pending' };
    }

    if (verification.status === 'SUCCESS') {
      if (record.status !== PaymentRecordStatus.PROCESSING) {
        return { success: true, idempotent: true, status: record.status };
      }

      const updated = await this.prisma.paymentRecord.updateMany({
        where: { id: record.id, status: PaymentRecordStatus.PROCESSING },
        data: { status: PaymentRecordStatus.SUBMITTED },
      });
      return { success: true, idempotent: updated.count === 0 };
    } else if (verification.status === 'FAILED') {
      if (record.status === PaymentRecordStatus.REJECTED) {
        return { success: true, idempotent: true, status: record.status };
      }

      const updated = await this.prisma.paymentRecord.updateMany({
        where: { id: record.id, status: PaymentRecordStatus.PROCESSING },
        data: {
          status: PaymentRecordStatus.REJECTED,
          reviewerNotes: 'Payment Failed at Gateway',
        },
      });
      return { success: true, idempotent: updated.count === 0 };
    }

    return { success: true };
  }

  private validateWebhookPayment(
    record: {
      amount: unknown;
      paymentDueId: string;
      status: PaymentRecordStatus;
    },
    verification: WebhookVerificationResult,
  ): string | null {
    const paymentDueId = verification.metadata?.paymentDueId;
    if (paymentDueId && paymentDueId !== record.paymentDueId) {
      return 'Webhook paymentDueId does not match the payment record';
    }

    if (verification.currency && verification.currency !== 'SAR') {
      return 'Webhook currency does not match the expected currency';
    }

    if (verification.amountMinor !== undefined) {
      const expectedMinor = Math.round(Number(record.amount) * 100);
      if (verification.amountMinor !== expectedMinor) {
        return 'Webhook amount does not match the payment record';
      }
    }

    return null;
  }
}
