import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EntitiesService } from './entities.service';

describe('EntitiesService', () => {
  let prisma: {
    entity: { findUnique: jest.Mock; findMany: jest.Mock };
    membership: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    membershipApplication: { upsert: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { createBulk: jest.Mock };
  let service: EntitiesService;

  beforeEach(() => {
    prisma = {
      entity: { findUnique: jest.fn(), findMany: jest.fn() },
      membership: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      membershipApplication: { upsert: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    notifications = { createBulk: jest.fn().mockResolvedValue(undefined) };
    service = new EntitiesService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it('does not expose an entity to a non-member', async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: 'entity-id',
      memberships: [],
    });
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.findById('entity-id', 'outsider-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns only the requester membership identity on entity details', async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: 'entity-id',
      name: 'Entity',
      memberships: [{ id: 'membership-id', role: 'TREASURER' }],
      _count: { memberships: 8 },
    });
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership-id' });

    await expect(service.findById('entity-id', 'person-id')).resolves.toEqual({
      id: 'entity-id',
      name: 'Entity',
      myMembershipId: 'membership-id',
      myRole: 'TREASURER',
      _count: { memberships: 8 },
    });
  });

  it('returns the requester role with each visible entity', async () => {
    prisma.entity.findMany.mockResolvedValue([
      {
        id: 'entity-id',
        name: 'Entity',
        memberships: [{ id: 'membership-id', role: 'MEMBER' }],
        _count: { memberships: 3 },
      },
    ]);

    await expect(service.findMyEntities('person-id')).resolves.toEqual([
      {
        id: 'entity-id',
        name: 'Entity',
        myMembershipId: 'membership-id',
        myRole: 'MEMBER',
        _count: { memberships: 3 },
      },
    ]);
  });

  it('returns privacy-safe dispute respondent options for members', async () => {
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership-id' });
    prisma.membership.findMany.mockResolvedValue([
      { person: { id: 'person-2', name: 'عضو آخر' } },
    ]);

    await expect(
      service.getDisputeRespondentOptions('entity-id', 'person-id'),
    ).resolves.toEqual([{ id: 'person-2', name: 'عضو آخر' }]);

    expect(prisma.membership.findMany).toHaveBeenCalledWith({
      where: {
        entityId: 'entity-id',
        isActive: true,
        personId: { not: 'person-id' },
      },
      select: {
        person: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  });

  it('creates a pending application without creating a membership', async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: 'entity-id',
      policy: {
        allowOpenMembership: true,
        requiresMemberApproval: true,
      },
    });
    prisma.membership.findUnique.mockResolvedValue(null);
    prisma.membershipApplication.upsert.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'application-id',
          ...data,
        }),
    );

    const application = await service.requestToJoin('entity-id', 'person-id');

    expect(prisma.membershipApplication.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          entityId: 'entity-id',
          personId: 'person-id',
        }),
      }),
    );
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(application).toMatchObject({ id: 'application-id' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
