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
  let stripeProvider: { verifyWebhook: jest.Mock };
  let moyasarProvider: { verifyWebhook: jest.Mock };
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      paymentRecord: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    stripeProvider = { verifyWebhook: jest.fn() };
    moyasarProvider = { verifyWebhook: jest.fn() };
    service = new PaymentsService(
      prisma as never,
      stripeProvider as IPaymentGateway,
      moyasarProvider as IPaymentGateway,
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

  it('moves a processing payment record to submitted on a matched success webhook', async () => {
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
});
