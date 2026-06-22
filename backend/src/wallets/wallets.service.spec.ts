import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from './wallets.service';

describe('WalletsService — setWalletOwnership', () => {
  let prisma: {
    wallet: { findUnique: jest.Mock };
    walletOwnership: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
    membership: { findFirst: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: WalletsService;
  // Wallet fixture reused across describe blocks
  const WALLET_WITH_ACCOUNT = {
    id: 'wallet-id',
    entityId: 'entity-id',
    isActive: true,
    ledgerAccount: { balance: 1000, currency: 'SAR' },
    ownerships: [] as {
      entityId: string;
      sharePercent: number;
      entity: { id: string; name: string; type: string };
    }[],
  };

  const WALLET = { id: 'wallet-id', entityId: 'entity-id', isActive: true };

  beforeEach(() => {
    prisma = {
      wallet: {
        findUnique: jest.fn().mockResolvedValue(WALLET),
      },
      walletOwnership: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'admin' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };

    service = new WalletsService(prisma as unknown as PrismaService);
  });

  it('saves ownerships when shares sum to exactly 100%', async () => {
    await service.setWalletOwnership('wallet-id', 'admin-id', {
      ownerships: [
        { entityId: 'entity-a', sharePercent: 60 },
        { entityId: 'entity-b', sharePercent: 40 },
      ],
    });

    expect(prisma.walletOwnership.deleteMany).toHaveBeenCalledWith({
      where: { walletId: 'wallet-id' },
    });
    expect(prisma.walletOwnership.createMany).toHaveBeenCalledWith({
      data: [
        { walletId: 'wallet-id', entityId: 'entity-a', sharePercent: 60 },
        { walletId: 'wallet-id', entityId: 'entity-b', sharePercent: 40 },
      ],
    });
  });

  it('accepts shares that sum to 100% within floating-point tolerance', async () => {
    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', {
        ownerships: [
          { entityId: 'entity-a', sharePercent: 33.34 },
          { entityId: 'entity-b', sharePercent: 33.33 },
          { entityId: 'entity-c', sharePercent: 33.33 },
        ],
      }),
    ).resolves.not.toThrow();
  });

  it('rejects when the ownership list is empty', async () => {
    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', { ownerships: [] }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', { ownerships: [] }),
    ).rejects.toThrow('يجب تحديد مالك واحد على الأقل');
  });

  it('rejects when shares do not sum to 100%', async () => {
    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', {
        ownerships: [
          { entityId: 'entity-a', sharePercent: 60 },
          { entityId: 'entity-b', sharePercent: 30 },
        ],
      }),
    ).rejects.toThrow('مجموع نسب الملكية يجب أن يساوي 100%');
  });

  it('rejects when the same entityId appears more than once', async () => {
    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', {
        ownerships: [
          { entityId: 'entity-a', sharePercent: 50 },
          { entityId: 'entity-a', sharePercent: 50 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.setWalletOwnership('wallet-id', 'admin-id', {
        ownerships: [
          { entityId: 'entity-a', sharePercent: 50 },
          { entityId: 'entity-a', sharePercent: 50 },
        ],
      }),
    ).rejects.toThrow('لا يمكن تكرار الكيان');
  });
});

describe('WalletsService — getWalletOwnershipReport', () => {
  let prisma: {
    wallet: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock };
  };
  let service: WalletsService;

  beforeEach(() => {
    prisma = {
      wallet: { findUnique: jest.fn() },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'member' }),
      },
    };
    service = new WalletsService(prisma as unknown as PrismaService);
  });

  it('calculates shareAmount correctly for each owner', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-id',
      entityId: 'entity-id',
      ledgerAccount: { balance: 1000, currency: 'SAR' },
      ownerships: [
        { entityId: 'entity-a', sharePercent: 60, entity: { id: 'entity-a', name: 'صندوق أ', type: 'FUND' } },
        { entityId: 'entity-b', sharePercent: 40, entity: { id: 'entity-b', name: 'صندوق ب', type: 'FUND' } },
      ],
    });

    const report = await service.getWalletOwnershipReport('wallet-id', 'requester-id');

    expect(report.balance).toBe(1000);
    expect(report.currency).toBe('SAR');
    expect(report.ownerships).toEqual([
      expect.objectContaining({ entityId: 'entity-a', sharePercent: 60, shareAmount: 600 }),
      expect.objectContaining({ entityId: 'entity-b', sharePercent: 40, shareAmount: 400 }),
    ]);
  });

  it('returns zero shareAmount for all owners when balance is zero', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-id',
      entityId: 'entity-id',
      ledgerAccount: { balance: 0, currency: 'SAR' },
      ownerships: [
        { entityId: 'entity-a', sharePercent: 70, entity: { id: 'entity-a', name: 'أ', type: 'FUND' } },
        { entityId: 'entity-b', sharePercent: 30, entity: { id: 'entity-b', name: 'ب', type: 'FUND' } },
      ],
    });

    const report = await service.getWalletOwnershipReport('wallet-id', 'requester-id');

    expect(report.balance).toBe(0);
    report.ownerships.forEach((o) => expect(o.shareAmount).toBe(0));
  });

  it('rounds shareAmount to two decimal places', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-id',
      entityId: 'entity-id',
      ledgerAccount: { balance: 100, currency: 'SAR' },
      ownerships: [
        { entityId: 'entity-a', sharePercent: 33.33, entity: { id: 'entity-a', name: 'أ', type: 'FUND' } },
        { entityId: 'entity-b', sharePercent: 33.33, entity: { id: 'entity-b', name: 'ب', type: 'FUND' } },
        { entityId: 'entity-c', sharePercent: 33.34, entity: { id: 'entity-c', name: 'ج', type: 'FUND' } },
      ],
    });

    const report = await service.getWalletOwnershipReport('wallet-id', 'requester-id');

    report.ownerships.forEach((o) => {
      const decimals = (o.shareAmount.toString().split('.')[1] ?? '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
    const total = report.ownerships.reduce((s, o) => s + o.shareAmount, 0);
    expect(total).toBeCloseTo(100, 1);
  });

  it('returns empty ownerships array when no ownership records exist', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-id',
      entityId: 'entity-id',
      ledgerAccount: { balance: 500, currency: 'SAR' },
      ownerships: [],
    });

    const report = await service.getWalletOwnershipReport('wallet-id', 'requester-id');

    expect(report.ownerships).toHaveLength(0);
    expect(report.balance).toBe(500);
  });

  it('throws ForbiddenException when requester is not a member', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-id',
      entityId: 'entity-id',
      ledgerAccount: { balance: 0, currency: 'SAR' },
      ownerships: [],
    });
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.getWalletOwnershipReport('wallet-id', 'outsider-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
