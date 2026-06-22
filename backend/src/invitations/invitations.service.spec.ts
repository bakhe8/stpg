import { JwtService } from '@nestjs/jwt';
import { MembershipApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService membership boundary', () => {
  it('creates a pending application without creating a membership', async () => {
    const tx = {
      membershipApplication: {
        upsert: jest.fn().mockResolvedValue({
          id: 'application-id',
          entityId: 'entity-id',
          status: MembershipApplicationStatus.PENDING,
        }),
      },
      invitation: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      membership: { create: jest.fn() },
    };
    const prisma = {
      invitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'invitation-id',
          entityId: 'entity-id',
          entity: { id: 'entity-id' },
          isActive: true,
          expiresAt: null,
          maxUses: 10,
          usedCount: 0,
        }),
      },
      membership: { findFirst: jest.fn().mockResolvedValue(null) },
      membershipApplication: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const service = new InvitationsService(
      prisma as unknown as PrismaService,
      {} as JwtService,
    );

    const result = await service.joinViaInvitationAuthenticated(
      'token',
      'person-id',
      { relationshipDescription: 'قريب لأحد الأعضاء' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        applicationId: 'application-id',
        status: MembershipApplicationStatus.PENDING,
      }),
    );
    expect(tx.membershipApplication.upsert).toHaveBeenCalled();
    expect(tx.membership.create).not.toHaveBeenCalled();
  });
});
