import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntentDto, GatewayProvider } from './dto/create-intent.dto';
import { STRIPE_PROVIDER, MOYASAR_PROVIDER } from './interfaces/payment-gateway.interface';
import type { IPaymentGateway } from './interfaces/payment-gateway.interface';
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

  async createIntent(userId: string, dto: CreateIntentDto) {
    const due = await this.prisma.paymentDue.findUnique({
      where: { id: dto.paymentDueId },
      include: { subscription: true },
    });

    if (!due) throw new NotFoundException('PaymentDue not found');
    if (due.status === 'PAID') throw new BadRequestException('Already paid');

    const provider = this.getProvider(dto.provider);
    const intentResult = await provider.createPaymentIntent({
      amount: due.amountDue.toNumber(),
      currency: 'SAR',
      metadata: {
        paymentDueId: due.id,
        userId,
      },
    });

    // We can proactively create a PaymentRecord in PROCESSING state
    await this.prisma.paymentRecord.create({
      data: {
        subscriptionId: due.subscriptionId,
        paymentDueId: due.id,
        submittedById: userId,
        amount: due.amountDue,
        reference: intentResult.id,
        status: PaymentRecordStatus.PROCESSING,
        paymentMethod: dto.provider === GatewayProvider.STRIPE ? PaymentMethod.STRIPE : PaymentMethod.MOYASAR,
        gatewayTransactionId: intentResult.id,
      },
    });

    return intentResult;
  }

  async handleWebhook(providerName: GatewayProvider, payload: any, signature?: string) {
    const provider = this.getProvider(providerName);
    const verification = await provider.verifyWebhook(payload, signature);

    if (!verification.isValid || !verification.transactionId) {
      return { success: false, reason: 'Invalid signature or missing transactionId' };
    }

    // Find the processing record
    const record = await this.prisma.paymentRecord.findUnique({
      where: { gatewayTransactionId: verification.transactionId },
    });

    if (!record) {
      return { success: false, reason: 'Record not found' };
    }

    if (verification.status === 'SUCCESS') {
      // Mark as submitted (or confirmed directly depending on business logic)
      // For now, let's just mark it SUBMITTED so the admin can see it, or CONFIRMED immediately.
      // Usually online payments are auto-confirmed.
      await this.prisma.paymentRecord.update({
        where: { id: record.id },
        data: { status: PaymentRecordStatus.SUBMITTED }, 
      });
    } else if (verification.status === 'FAILED') {
      await this.prisma.paymentRecord.update({
        where: { id: record.id },
        data: { status: PaymentRecordStatus.REJECTED, reviewerNotes: 'Payment Failed at Gateway' },
      });
    }

    return { success: true };
  }
}
