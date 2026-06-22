/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException } from '@nestjs/common';
import {
  PaymentDueStatus,
  PaymentRecordStatus,
  SubscriptionState,
} from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService payment records', () => {
  let prisma: {
    paymentDue: { findUnique: jest.Mock };
    paymentRecord: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    membership: { findMany: jest.Mock; findFirst: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationsService: { notifyPaymentRecorded: jest.Mock };
  let ledgerService: { recordPaymentWithClient: jest.Mock };
  let rulesService: { evaluateSubscriptionRules: jest.Mock };
  let service: SubscriptionsService;

  beforeEach(() => {
    prisma = {
      paymentDue: { findUnique: jest.fn() },
      paymentRecord: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      membership: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'reviewer-membership' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };

    notificationsService = {
      notifyPaymentRecorded: jest.fn().mockResolvedValue(undefined),
    };
    ledgerService = {
      recordPaymentWithClient: jest
        .fn()
        .mockResolvedValue({ id: 'transaction-id' }),
    };
    rulesService = {
      evaluateSubscriptionRules: jest
        .fn()
        .mockResolvedValue({ allowed: true, violations: [] }),
    };

    service = new SubscriptionsService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      ledgerService as unknown as LedgerService,
      rulesService as unknown as RulesService,
    );
  });

  it('creates a payment record from the due amount for the subscriber', async () => {
    prisma.paymentDue.findUnique.mockResolvedValue({
      id: 'due-id',
      subscriptionId: 'subscription-id',
      amountDue: 150,
      status: PaymentDueStatus.PENDING,
      transactionId: null,
      subscription: {
        id: 'subscription-id',
        state: SubscriptionState.ACTIVE,
        membership: { personId: 'person-id', entityId: 'entity-id' },
        governancePath: { id: 'path-id', name: 'مسار التكافل' },
      },
    });
    prisma.paymentRecord.findFirst.mockResolvedValueOnce(null);
    prisma.paymentRecord.findFirst.mockResolvedValueOnce(null);
    prisma.paymentRecord.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'record-id',
          ...data,
          paymentDue: { id: 'due-id', periodLabel: '2026-07' },
          subscription: {
            governancePath: { id: 'path-id', name: 'مسار التكافل' },
            membership: {
              entityId: 'entity-id',
              person: { id: 'person-id', name: 'Bakheet', username: 'bakheet' },
            },
          },
        }),
    );

    await service.createPaymentRecord('person-id', {
      paymentDueId: 'due-id',
      reference: 'BANK-500',
      description: 'إيصال تحويل',
    });

    expect(prisma.paymentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: 'subscription-id',
          paymentDueId: 'due-id',
          submittedById: 'person-id',
          amount: 150,
          reference: 'BANK-500',
          status: PaymentRecordStatus.SUBMITTED,
        }),
      }),
    );
  });

  it('confirms a submitted payment record through the ledger and marks it confirmed', async () => {
    prisma.paymentRecord.findUnique.mockResolvedValue({
      id: 'record-id',
      subscriptionId: 'subscription-id',
      paymentDueId: 'due-id',
      submittedById: 'person-id',
      amount: 200,
      reference: 'BANK-900',
      description: 'تحويل بنكي',
      attachments: [],
      status: PaymentRecordStatus.SUBMITTED,
      paymentDue: {
        id: 'due-id',
        periodLabel: '2026-07',
        status: PaymentDueStatus.PENDING,
        transactionId: null,
      },
      subscription: {
        membership: {
          personId: 'person-id',
          entityId: 'entity-id',
          person: { id: 'person-id', name: 'Bakheet', username: 'bakheet' },
        },
        governancePath: { id: 'path-id', name: 'مسار التكافل' },
      },
    });
    prisma.paymentRecord.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'record-id',
          ...data,
          paymentDue: { id: 'due-id', periodLabel: '2026-07' },
          subscription: {
            governancePath: { id: 'path-id', name: 'مسار التكافل' },
            membership: {
              entityId: 'entity-id',
              person: { id: 'person-id', name: 'Bakheet', username: 'bakheet' },
            },
          },
        }),
    );

    await service.approvePaymentRecord('record-id', 'reviewer-id', {
      reviewerNotes: 'تم التحقق',
    });

    expect(ledgerService.recordPaymentWithClient).toHaveBeenCalledWith(
      prisma,
      'reviewer-id',
      expect.objectContaining({
        subscriptionId: 'subscription-id',
        paymentDueId: 'due-id',
        amount: 200,
        reference: 'BANK-900',
      }),
    );
    expect(prisma.paymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'record-id' },
        data: expect.objectContaining({
          status: PaymentRecordStatus.CONFIRMED,
          transactionId: 'transaction-id',
        }),
      }),
    );
    expect(notificationsService.notifyPaymentRecorded).toHaveBeenCalledWith(
      'person-id',
      200,
      'subscription-id',
    );
  });

  it('rejects creating another pending record for the same due', async () => {
    prisma.paymentDue.findUnique.mockResolvedValue({
      id: 'due-id',
      subscriptionId: 'subscription-id',
      amountDue: 150,
      status: PaymentDueStatus.PENDING,
      transactionId: null,
      subscription: {
        id: 'subscription-id',
        state: SubscriptionState.ACTIVE,
        membership: { personId: 'person-id', entityId: 'entity-id' },
        governancePath: { id: 'path-id', name: 'مسار التكافل' },
      },
    });
    prisma.paymentRecord.findFirst.mockResolvedValue({
      id: 'existing-record',
    });

    await expect(
      service.createPaymentRecord('person-id', {
        paymentDueId: 'due-id',
        reference: 'BANK-500',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
