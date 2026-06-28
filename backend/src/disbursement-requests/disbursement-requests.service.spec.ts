import { BadRequestException } from '@nestjs/common';
import {
  BeneficiaryType,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  DisbursementRequestStatus,
  MemberRole,
} from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { DisbursementRequestsService } from './disbursement-requests.service';

describe('DisbursementRequestsService beneficiaries', () => {
  let prisma: {
    governancePath: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock };
    spendingItem: { findUnique: jest.Mock };
    beneficiary: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    disbursementRequest: {
      create: jest.Mock;
      aggregate: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    decision: { findUnique: jest.Mock };
    ledgerAccount: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let ledgerService: { recordDisbursement: jest.Mock };
  let service: DisbursementRequestsService;

  beforeEach(() => {
    prisma = {
      governancePath: { findUnique: jest.fn() },
      membership: { findFirst: jest.fn() },
      spendingItem: { findUnique: jest.fn() },
      beneficiary: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      disbursementRequest: {
        create: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      decision: { findUnique: jest.fn() },
      ledgerAccount: { findUnique: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    ledgerService = {
      recordDisbursement: jest.fn(),
    };

    service = new DisbursementRequestsService(
      prisma as unknown as PrismaService,
      ledgerService as unknown as LedgerService,
    );
  });

  it('creates an external beneficiary automatically when creating a request', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      wallet: { entityId: 'entity-id' },
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
      entityId: 'entity-id',
    });
    prisma.spendingItem.findUnique.mockResolvedValue({
      id: 'spending-item-id',
      governancePathId: 'path-id',
      maxAmountPerRequest: null,
    });
    prisma.beneficiary.findFirst.mockResolvedValue(null);
    prisma.beneficiary.create.mockResolvedValue({
      id: 'beneficiary-id',
      entityId: 'entity-id',
      type: BeneficiaryType.EXTERNAL,
      displayName: 'مستفيد خارجي',
      notes: 'حالة اجتماعية',
      annualCap: null,
      isActive: true,
    });
    prisma.disbursementRequest.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'request-id', ...data }),
    );

    await service.createRequest('person-id', 'path-id', {
      spendingItemId: 'spending-item-id',
      beneficiaryName: 'مستفيد خارجي',
      beneficiaryNotes: 'حالة اجتماعية',
      amount: 300,
      description: 'طلب صرف علاجي',
    });

    expect(prisma.beneficiary.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-id',
        type: BeneficiaryType.EXTERNAL,
        displayName: 'مستفيد خارجي',
        notes: 'حالة اجتماعية',
      },
    });
    expect(prisma.disbursementRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          beneficiaryId: 'beneficiary-id',
          beneficiaryName: 'مستفيد خارجي',
        }),
      }),
    );
  });

  it('rejects requests that exceed the beneficiary annual cap', async () => {
    prisma.governancePath.findUnique.mockResolvedValue({
      id: 'path-id',
      wallet: { entityId: 'entity-id' },
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
      entityId: 'entity-id',
    });
    prisma.spendingItem.findUnique.mockResolvedValue({
      id: 'spending-item-id',
      governancePathId: 'path-id',
      maxAmountPerRequest: null,
    });
    prisma.beneficiary.findUnique.mockResolvedValue({
      id: 'beneficiary-id',
      entityId: 'entity-id',
      type: BeneficiaryType.EXTERNAL,
      displayName: 'مستفيد خارجي',
      annualCap: 1000,
      isActive: true,
    });
    prisma.disbursementRequest.aggregate.mockResolvedValue({
      _sum: { amount: 900 },
    });

    await expect(
      service.createRequest('person-id', 'path-id', {
        spendingItemId: 'spending-item-id',
        beneficiaryId: 'beneficiary-id',
        amount: 200,
        description: 'طلب صرف علاجي',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not approve a disbursement request without a closed approved decision', async () => {
    prisma.disbursementRequest.findUnique.mockResolvedValue({
      id: 'request-id',
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: { toString: () => '300.00' },
      status: DisbursementRequestStatus.PENDING,
      governancePath: {
        wallet: { entityId: 'entity-id' },
      },
    });
    prisma.membership.findFirst.mockResolvedValue({
      role: MemberRole.TREASURER,
    });

    await expect(
      service.approveRequest('request-id', 'admin-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.disbursementRequest.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE',
          targetId: 'request-id',
          newValue: expect.objectContaining({
            operation: 'APPROVE_DISBURSEMENT',
            failed: true,
          }),
        }),
      }),
    );
  });

  it('approves a request only when the linked decision matches type, path, item, and amount', async () => {
    prisma.disbursementRequest.findUnique.mockResolvedValue({
      id: 'request-id',
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: { toString: () => '300.00' },
      status: DisbursementRequestStatus.PENDING,
      governancePath: {
        wallet: { entityId: 'entity-id' },
      },
    });
    prisma.membership.findFirst.mockResolvedValue({
      role: MemberRole.TREASURER,
    });
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: { toString: () => '300.00' },
    });
    prisma.disbursementRequest.update.mockResolvedValue({
      id: 'request-id',
      status: DisbursementRequestStatus.APPROVED,
      decisionId: 'decision-id',
    });

    await service.approveRequest('request-id', 'admin-id', {
      decisionId: 'decision-id',
      reviewerNotes: 'مطابق للقرار',
    });

    expect(prisma.disbursementRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-id' },
        data: expect.objectContaining({
          status: DisbursementRequestStatus.APPROVED,
          decisionId: 'decision-id',
        }),
      }),
    );
  });

  it('checks the linked decision before checking balance during execution', async () => {
    prisma.disbursementRequest.findUnique.mockResolvedValue({
      id: 'request-id',
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      beneficiaryId: 'beneficiary-id',
      beneficiary: { annualCap: null },
      amount: { toString: () => '300.00' },
      description: 'صرف علاجي',
      attachments: [],
      status: DisbursementRequestStatus.APPROVED,
      transactionId: null,
      decisionId: null,
      governancePath: {
        wallet: { entityId: 'entity-id' },
      },
    });
    prisma.membership.findFirst.mockResolvedValue({
      role: MemberRole.TREASURER,
    });

    await expect(
      service.executeRequest('request-id', 'admin-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.ledgerAccount.findUnique).not.toHaveBeenCalled();
    expect(ledgerService.recordDisbursement).not.toHaveBeenCalled();
  });

  it('compares ledger balances as money values before execution', async () => {
    prisma.disbursementRequest.findUnique.mockResolvedValue({
      id: 'request-id',
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      beneficiaryId: 'beneficiary-id',
      beneficiary: { annualCap: null },
      amount: { toString: () => '10.00' },
      description: 'صرف علاجي',
      attachments: [],
      status: DisbursementRequestStatus.APPROVED,
      transactionId: null,
      decisionId: 'decision-id',
      governancePath: {
        wallet: { entityId: 'entity-id' },
      },
    });
    prisma.membership.findFirst.mockResolvedValue({
      role: MemberRole.TREASURER,
    });
    prisma.decision.findUnique.mockResolvedValue({
      id: 'decision-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      status: DecisionStatus.CLOSED,
      result: DecisionResult.APPROVED,
      governancePathId: 'path-id',
      spendingItemId: 'spending-item-id',
      amount: { toString: () => '10.00' },
    });
    prisma.ledgerAccount.findUnique.mockResolvedValue({
      balance: { toString: () => '9.99' },
    });

    await expect(
      service.executeRequest('request-id', 'admin-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(ledgerService.recordDisbursement).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          newValue: expect.objectContaining({
            operation: 'EXECUTE_DISBURSEMENT',
            failed: true,
            availableBalance: '9.99',
            requestedAmount: '10.00',
          }),
        }),
      }),
    );
  });
});
