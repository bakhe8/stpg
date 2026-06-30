import { PaymentRecordStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { GatewayProvider } from './dto/create-intent.dto';
import type { IPaymentGateway } from './interfaces/payment-gateway.interface';

describe('PaymentsService webhooks', () => {
  let prisma: {
    paymentRecord: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let stripeProvider: {
    createPaymentIntent: jest.Mock;
    verifyWebhook: jest.Mock;
  };
  let moyasarProvider: {
    createPaymentIntent: jest.Mock;
    verifyWebhook: jest.Mock;
  };
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      paymentRecord: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    stripeProvider = {
      createPaymentIntent: jest.fn(),
      verifyWebhook: jest.fn(),
    };
    moyasarProvider = {
      createPaymentIntent: jest.fn(),
      verifyWebhook: jest.fn(),
    };
    service = new PaymentsService(
      prisma as never,
      stripeProvider as unknown as IPaymentGateway,
      moyasarProvider as unknown as IPaymentGateway,
    );
  });

  it('refuses a successful webhook when the amount does not match the record', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 9999,
      currency: 'SAR',
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.PROCESSING,
    });

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({
      success: false,
      reason: 'Webhook amount does not match the payment record',
    });

    expect(prisma.paymentRecord.updateMany).not.toHaveBeenCalled();
  });

  it('moves a processing payment record to submitted on a matched success webhook (payment_intent.succeeded)', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 10000,
      currency: 'SAR',
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.PROCESSING,
    });

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({ success: true, idempotent: false });

    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-id', status: PaymentRecordStatus.PROCESSING },
      data: { status: PaymentRecordStatus.SUBMITTED },
    });
  });

  it('treats repeated success webhooks for already-submitted records as idempotent', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 10000,
      currency: 'SAR',
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.SUBMITTED,
    });

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({
      success: true,
      idempotent: true,
      status: PaymentRecordStatus.SUBMITTED,
    });

    expect(prisma.paymentRecord.updateMany).not.toHaveBeenCalled();
  });

  it('moves a processing payment record to rejected on a failed webhook (payment_intent.payment_failed)', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_1',
      status: 'FAILED',
      metadata: { paymentDueId: 'due-id' },
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.PROCESSING,
    });

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({ success: true, idempotent: false });

    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-id', status: PaymentRecordStatus.PROCESSING },
      data: {
        status: PaymentRecordStatus.REJECTED,
        reviewerNotes: 'Payment Failed at Gateway',
      },
    });
  });

  it('treats repeated failure webhooks for already-rejected records as idempotent (no double effect)', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_1',
      status: 'FAILED',
      metadata: { paymentDueId: 'due-id' },
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.REJECTED,
    });

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({
      success: true,
      idempotent: true,
      status: PaymentRecordStatus.REJECTED,
    });

    expect(prisma.paymentRecord.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized gateway transaction id', async () => {
    stripeProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'pi_unknown',
      status: 'SUCCESS',
    });
    prisma.paymentRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.handleWebhook(GatewayProvider.STRIPE, '{}', 'signature'),
    ).resolves.toEqual({ success: false, reason: 'Record not found' });

    expect(prisma.paymentRecord.updateMany).not.toHaveBeenCalled();
  });

  it('routes Moyasar webhooks through the Moyasar provider and applies the same success transition', async () => {
    moyasarProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'moyasar_ch_1',
      status: 'SUCCESS',
      metadata: { paymentDueId: 'due-id' },
      amountMinor: 10000,
      currency: 'SAR',
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.PROCESSING,
    });

    await expect(
      service.handleWebhook(GatewayProvider.MOYASAR, '{}', 'signature'),
    ).resolves.toEqual({ success: true, idempotent: false });

    expect(stripeProvider.verifyWebhook).not.toHaveBeenCalled();
    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-id', status: PaymentRecordStatus.PROCESSING },
      data: { status: PaymentRecordStatus.SUBMITTED },
    });
  });

  it('moves a processing Moyasar payment record to rejected on a failed webhook', async () => {
    moyasarProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      transactionId: 'moyasar_ch_2',
      status: 'FAILED',
      metadata: { paymentDueId: 'due-id' },
    });
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      amount: 100,
      paymentDueId: 'due-id',
      status: PaymentRecordStatus.PROCESSING,
    });

    await expect(
      service.handleWebhook(GatewayProvider.MOYASAR, '{}', 'signature'),
    ).resolves.toEqual({ success: true, idempotent: false });

    expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-id', status: PaymentRecordStatus.PROCESSING },
      data: {
        status: PaymentRecordStatus.REJECTED,
        reviewerNotes: 'Payment Failed at Gateway',
      },
    });
  });
});
