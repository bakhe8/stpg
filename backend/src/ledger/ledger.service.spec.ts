import { ForbiddenException } from '@nestjs/common';
import {
  DecisionResult,
  DecisionStatus,
  DecisionType,
  GovernancePathType,
  LedgerAccountType,
  LedgerEntryType,
  SubscriptionState,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  let prisma: {
    subscription: { findUnique: jest.Mock };
    paymentDue: { findUnique: jest.Mock; update: jest.Mock };
    governancePath: { findUnique: jest.Mock };
    spendingItem: { findUnique: jest.Mock };
    decision: { findUnique: jest.Mock; update: jest.Mock };
    membership: { findFirst: jest.Mock };
    entityRelationship: { findFirst: jest.Mock };
    ledgerTransaction: {
      aggregate: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    ledgerAccount: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let rulesService: {
    evaluateSpendingRules: jest.Mock;
    evaluateTransferRules: jest.Mock;
  };
  let service: LedgerService;

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn() },
      paymentDue: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      governancePath: { findUnique: jest.fn() },
      spendingItem: { findUnique: jest.fn() },
      decision: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      membership: { findFirst: jest.fn().mockResolvedValue({ id: 'admin' }) },
      ledgerTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      ledgerAccount: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'external-account' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      entityRelationship: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    rulesService = {
      evaluateSpendingRules: jest
        .fn()
        .mockResolvedValue({ allowed: true, violations: [] }),
      evaluateTransferRules: jest
        .fn()
        .mockResolvedValue({ allowed: true, violations: [] }),
    };

    service = new LedgerService(
      prisma as unknown as PrismaService,
      rulesService as unknown as RulesService,
    );
  });

  it('records a subscription payment as balanced debit and credit entries', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'subscription-id',
      state: SubscriptionState.ACTIVE,
      governancePath: {
        id: 'path-id',
        walletId: 'wallet-id',
        type: GovernancePathType.PUBLIC_VOTE,
        wallet: { entityId: 'entity-id' },
        ledgerAccount: { id: 'path-account' },
      },
      membership: { personId: 'payer-id' },
    });
    prisma.ledgerTransaction.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'transaction-id', ...data }),
    );

    await service.recordPayment('admin-id', {
      subscriptionId: 'subscription-id',
      amount: 100,
      reference: 'BANK-100',
      attachments: [],
    });

    expect(prisma.ledgerTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entries: {
            create: [
              {
                accountId: 'external-account',
                type: LedgerEntryType.DEBIT,
                amount: 100,
              },
              {
                accountId: 'path-account',
                type: LedgerEntryType.CREDIT,
                amount: 100,
              },
            ],
          },
        }),
      }),
    );
  });

  it('settles a payment due when the payment is linked to it', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'subscription-id',
      state: SubscriptionState.ACTIVE,
      governancePath: {
        id: 'path-id',
        walletId: 'wallet-id',
        type: GovernancePathType.PUBLIC_VOTE,
        wallet: { entityId: 'entity-id' },
        ledgerAccount: { id: 'path-account' },
      },
      membership: { personId: 'payer-id' },
    });
    prisma.paymentDue.findUnique.mockResolvedValue({
      id: 'due-id',
      subscriptionId: 'subscription-id',
      amountDue: 100,
      status: 'PENDING',
      transactionId: null,
    });
    prisma.ledgerTransaction.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'transaction-id', ...data }),
    );

    await service.recordPayment('admin-id', {
      subscriptionId: 'subscription-id',
      paymentDueId: 'due-id',
      amount: 100,
      reference: 'BANK-101',
      attachments: [],
    });

    expect(prisma.paymentDue.update).toHaveBeenCalledWith({
      where: { id: 'due-id' },
      data: expect.objectContaining({
        status: 'PAID',
        transactionId: 'transaction-id',
      }),
    });
  });

  it('does not expose an unscoped external ledger account', async () => {
    prisma.ledgerAccount.findUnique.mockResolvedValue({
      id: 'external-account',
      type: LedgerAccountType.EXTERNAL,
      balance: 0,
      entity: null,
      wallet: null,
      governancePath: null,
      spendingItem: null,
    });

    await expect(
      service.getAccountTransactions('external-account', 'person-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a disbursement that exceeds the remaining approved decision amount', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      walletId: 'wallet-id',
      wallet: { entityId: 'entity-id' },
      ledgerAccount: { id: 'path-account', balance: 500 },
      policy: { requiresDocuments: false },
    });
    prisma.spendingItem.findUnique.mockResolvedValue({
      id: 'spending-item-id',
      governancePathId: 'path-id',
      isActive: true,
      ledgerAccount: { id: 'spending-item-account' },
      maxAmountPerRequest: null,
      maxAmountPerYear: null,
      requiresCommitteeApproval: false,
      requiredDocuments: [],
    });
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: 100,
      votersScope: VotersScope.ALL_MEMBERS,
      attachments: [],
    });
    prisma.ledgerTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 80 },
    });

    await expect(
      service.recordDisbursement('admin-id', {
        pathId: 'path-id',
        spendingItemId: 'spending-item-id',
        decisionId: 'decision-id',
        amount: 30,
        description: 'صرف علاجي',
      }),
    ).rejects.toThrow('المبلغ يتجاوز المتبقي من القرار المعتمد');

    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
  });

  it('validates the governance decision before reporting insufficient balance', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      walletId: 'wallet-id',
      wallet: { entityId: 'entity-id' },
      ledgerAccount: { id: 'path-account', balance: 0 },
      policy: { requiresDocuments: false },
    });
    prisma.spendingItem.findUnique.mockResolvedValue({
      id: 'spending-item-id',
      governancePathId: 'path-id',
      isActive: true,
      ledgerAccount: { id: 'spending-item-account' },
      maxAmountPerRequest: null,
      maxAmountPerYear: null,
      requiresCommitteeApproval: false,
      requiredDocuments: [],
    });
    prisma.decision.findUnique.mockResolvedValue(null);

    await expect(
      service.recordDisbursement('admin-id', {
        pathId: 'path-id',
        spendingItemId: 'spending-item-id',
        decisionId: 'missing-decision-id',
        amount: 30,
        description: 'صرف بلا قرار صالح',
      }),
    ).rejects.toThrow(
      'يتطلب الصرف قرار DISBURSE_FUNDS مغلقاً ومعتمداً ومطابقاً',
    );

    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
    expect(rulesService.evaluateSpendingRules).not.toHaveBeenCalled();
  });

  it('records failed disbursement validation attempts in audit log', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      walletId: 'wallet-id',
      wallet: { entityId: 'entity-id' },
      ledgerAccount: { id: 'path-account', balance: 10 },
      policy: { requiresDocuments: false },
    });
    prisma.spendingItem.findUnique.mockResolvedValue({
      id: 'spending-item-id',
      governancePathId: 'path-id',
      isActive: true,
      ledgerAccount: { id: 'spending-item-account' },
      maxAmountPerRequest: null,
      maxAmountPerYear: null,
      requiresCommitteeApproval: false,
      requiredDocuments: [],
    });
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: 100,
      votersScope: VotersScope.ALL_MEMBERS,
      attachments: [],
    });

    await expect(
      service.recordDisbursement('admin-id', {
        pathId: 'path-id',
        spendingItemId: 'spending-item-id',
        decisionId: 'decision-id',
        amount: 50,
        description: 'صرف يتجاوز الرصيد',
      }),
    ).rejects.toThrow('الرصيد غير كافٍ');

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REJECT',
          personId: 'admin-id',
          entityId: 'entity-id',
          targetType: 'ledger_validation_failures',
          newValue: expect.objectContaining({
            type: 'DISBURSEMENT',
            status: 'FAILED',
            pathId: 'path-id',
            spendingItemId: 'spending-item-id',
            decisionId: 'decision-id',
            amount: 50,
          }),
        }),
      }),
    );
    expect(prisma.ledgerTransaction.create).not.toHaveBeenCalled();
  });

  describe('recordEntitySupport', () => {
    const makeSourcePath = (sourceEntityId = 'entity-a') => ({
      id: 'source-path-id',
      walletId: 'wallet-a',
      wallet: { entityId: sourceEntityId },
      ledgerAccount: { id: 'source-account', balance: 500 },
    });
    const makeTargetPath = (targetEntityId = 'entity-b') => ({
      id: 'target-path-id',
      walletId: 'wallet-b',
      wallet: { entityId: targetEntityId },
      ledgerAccount: { id: 'target-account', balance: 0 },
    });
    const makeSupportDecision = (amount = 200) => ({
      id: 'decision-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      subjectType: 'PATH',
      subjectId: 'source-path-id',
      governancePathId: 'source-path-id',
      governancePath: { wallet: { entityId: 'entity-a' } },
      amount,
    });

    it('creates DEBIT on source and CREDIT on target across two entities', async () => {
      prisma.governancePath.findUnique
        .mockResolvedValueOnce(makeSourcePath())
        .mockResolvedValueOnce(makeTargetPath());
      prisma.entityRelationship.findFirst.mockResolvedValue({ id: 'rel-id' });
      prisma.decision.findUnique.mockResolvedValue(makeSupportDecision());
      prisma.ledgerTransaction.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'txn-id', ...data }),
      );

      await service.recordEntitySupport('admin-id', {
        sourcePathId: 'source-path-id',
        targetPathId: 'target-path-id',
        amount: 200,
        description: 'دعم مالي',
        decisionId: 'decision-id',
      });

      expect(prisma.ledgerTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entries: {
              create: [
                {
                  accountId: 'source-account',
                  type: LedgerEntryType.DEBIT,
                  amount: 200,
                },
                {
                  accountId: 'target-account',
                  type: LedgerEntryType.CREDIT,
                  amount: 200,
                },
              ],
            },
            decisionId: 'decision-id',
          }),
        }),
      );
    });

    it('rejects when source and target belong to the same entity', async () => {
      prisma.governancePath.findUnique
        .mockResolvedValueOnce(makeSourcePath('same-entity'))
        .mockResolvedValueOnce(makeTargetPath('same-entity'));

      await expect(
        service.recordEntitySupport('admin-id', {
          sourcePathId: 'source-path-id',
          targetPathId: 'target-path-id',
          amount: 100,
          description: 'خطأ',
          decisionId: 'decision-id',
        }),
      ).rejects.toThrow('المصدر والهدف في نفس الكيان');
    });

    it('rejects when no active FINANCIAL_SUPPORT relationship exists', async () => {
      prisma.governancePath.findUnique
        .mockResolvedValueOnce(makeSourcePath())
        .mockResolvedValueOnce(makeTargetPath());
      prisma.entityRelationship.findFirst.mockResolvedValue(null);

      await expect(
        service.recordEntitySupport('admin-id', {
          sourcePathId: 'source-path-id',
          targetPathId: 'target-path-id',
          amount: 100,
          description: 'دعم',
          decisionId: 'decision-id',
        }),
      ).rejects.toThrow('لا توجد علاقة دعم مالي');
    });

    it('rejects when source account balance is insufficient', async () => {
      prisma.governancePath.findUnique
        .mockResolvedValueOnce(makeSourcePath())
        .mockResolvedValueOnce(makeTargetPath());
      prisma.entityRelationship.findFirst.mockResolvedValue({ id: 'rel-id' });
      prisma.decision.findUnique.mockResolvedValue(makeSupportDecision(999));
      prisma.ledgerTransaction.create.mockResolvedValue({ id: 'txn-id' });
      prisma.ledgerAccount.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.recordEntitySupport('admin-id', {
          sourcePathId: 'source-path-id',
          targetPathId: 'target-path-id',
          amount: 999,
          description: 'أكثر من الرصيد',
          decisionId: 'decision-id',
        }),
      ).rejects.toThrow('الرصيد غير كافٍ لإتمام الدعم');
    });
  });

  it('marks a transfer decision as completed once the transfer is posted', async () => {
    prisma.governancePath.findUnique
      .mockResolvedValueOnce({
        id: 'source-path-id',
        walletId: 'wallet-id',
        wallet: { entityId: 'entity-id' },
        ledgerAccount: { id: 'source-account', balance: 300 },
        policy: { allowBalanceTransfer: true },
      })
      .mockResolvedValueOnce({
        id: 'target-path-id',
        walletId: 'wallet-id',
        wallet: { entityId: 'entity-id' },
        ledgerAccount: { id: 'target-account', balance: 100 },
      });
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.TRANSFER_BALANCE,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      governancePathId: 'source-path-id',
      amount: 50,
    });
    prisma.ledgerTransaction.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'transaction-id', ...data }),
    );

    await service.recordTransfer('admin-id', {
      sourcePathId: 'source-path-id',
      targetPathId: 'target-path-id',
      decisionId: 'decision-id',
      amount: 50,
      description: 'تحويل رصيد',
    });

    expect(prisma.decision.update).toHaveBeenCalledWith({
      where: { id: 'decision-id' },
      data: expect.objectContaining({
        executionStatus: 'COMPLETED',
      }),
    });
  });
});
