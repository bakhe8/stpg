import { ForbiddenException } from '@nestjs/common';
import { GovernancePathType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GovernancePathsService } from './governance-paths.service';

describe('GovernancePathsService', () => {
  let prisma: {
    wallet: { findUnique: jest.Mock };
    entityPolicy: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock };
    governancePath: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: GovernancePathsService;

  beforeEach(() => {
    prisma = {
      wallet: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'wallet-id', entityId: 'entity-id' }),
      },
      entityPolicy: { findUnique: jest.fn() },
      membership: { findFirst: jest.fn().mockResolvedValue({ id: 'admin' }) },
      governancePath: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'path-id',
          name: 'Board',
          type: GovernancePathType.BOARD,
          walletId: 'wallet-id',
          policy: { id: 'policy-id' },
        }),
        findUnique: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    service = new GovernancePathsService(prisma as unknown as PrismaService);
  });

  it('treats missing allowed governance types as an empty allow-list', async () => {
    prisma.entityPolicy.findUnique.mockResolvedValue({
      entityId: 'entity-id',
      allowMultiplePaths: true,
      allowedGovernanceTypes: undefined,
    });

    await expect(
      service.createPath('wallet-id', 'admin-id', {
        name: 'Board',
        type: GovernancePathType.BOARD,
      }),
    ).resolves.toMatchObject({
      id: 'path-id',
      type: GovernancePathType.BOARD,
    });

    expect(prisma.governancePath.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'wallet-id',
        name: 'Board',
        type: GovernancePathType.BOARD,
      }),
      include: { policy: true },
    });
  });

  it('rejects governance path types outside an explicit allow-list', async () => {
    prisma.entityPolicy.findUnique.mockResolvedValue({
      entityId: 'entity-id',
      allowMultiplePaths: true,
      allowedGovernanceTypes: [GovernancePathType.COMMITTEE],
    });

    await expect(
      service.createPath('wallet-id', 'admin-id', {
        name: 'Board',
        type: GovernancePathType.BOARD,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
