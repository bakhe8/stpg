import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuspendedEntityGuard } from './suspended-entity.guard';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('SuspendedEntityGuard', () => {
  const entityId = '46cdfbc6-6062-5645-936a-f5301360044a';
  let prisma: {
    entity: { findUnique: jest.Mock };
    wallet: { findUnique: jest.Mock };
  };
  let guard: SuspendedEntityGuard;

  beforeEach(() => {
    prisma = {
      entity: { findUnique: jest.fn() },
      wallet: { findUnique: jest.fn() },
    };
    guard = new SuspendedEntityGuard(
      prisma as never,
      {
        runInternal: (fn: () => Promise<boolean>) => fn(),
      } as never,
    );
  });

  it('resolves entity routes behind the global /api prefix before DTO validation can run', async () => {
    prisma.entity.findUnique.mockResolvedValue({
      platformStatus: 'READ_ONLY',
      suspendedReason: null,
    });

    await expect(
      guard.canActivate(
        contextFor({
          params: { id: entityId },
          body: {},
          method: 'POST',
          originalUrl: `/api/entities/${entityId}/campaigns`,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.entity.findUnique).toHaveBeenCalledWith({
      where: { id: entityId },
      select: { platformStatus: true, suspendedReason: true },
    });
  });

  it('continues to resolve other id-based resources behind the global /api prefix', async () => {
    prisma.wallet.findUnique.mockResolvedValue({ entityId });
    prisma.entity.findUnique.mockResolvedValue({
      platformStatus: 'SUSPENDED',
      suspendedReason: 'qa',
    });

    await expect(
      guard.canActivate(
        contextFor({
          params: { id: 'wallet-id' },
          body: {},
          method: 'GET',
          originalUrl: '/api/wallets/wallet-id',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: { id: 'wallet-id' },
      select: { entityId: true },
    });
  });
});
