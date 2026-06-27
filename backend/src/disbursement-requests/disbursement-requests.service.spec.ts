import { BadRequestException } from '@nestjs/common';
import { BeneficiaryType } from '@prisma/client';
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
    disbursementRequest: { create: jest.Mock; aggregate: jest.Mock };
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
      },
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
});
