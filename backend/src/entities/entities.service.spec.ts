import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  EntityType,
  GovernancePathType,
  LedgerAccountType,
  MemberRole,
  VoteType,
  WalletBenefitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../core/tenant-context/tenant-context.service';
import { EntitiesService } from './entities.service';

describe('EntitiesService', () => {
  let prisma: {
    person: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    entity: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    entityTemplate: { findUnique: jest.Mock };
    entityPolicy: { findUnique: jest.Mock; update: jest.Mock };
    policyVersion: { create: jest.Mock };
    wallet: { create: jest.Mock };
    governancePath: { create: jest.Mock };
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
  let tenantContext: { runInternal: jest.Mock };
  let service: EntitiesService;

  beforeEach(() => {
    prisma = {
      person: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      entity: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      entityTemplate: { findUnique: jest.fn() },
      entityPolicy: { findUnique: jest.fn(), update: jest.fn() },
      policyVersion: { create: jest.fn().mockResolvedValue({}) },
      wallet: { create: jest.fn() },
      governancePath: { create: jest.fn() },
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
    tenantContext = {
      runInternal: jest.fn((callback: () => unknown) => callback()),
    };
    service = new EntitiesService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      tenantContext as unknown as TenantContextService,
    );
  });

  it('creates an entity with the low-level create contract only', async () => {
    prisma.person.findUnique.mockResolvedValue({
      id: 'creator-id',
      isVerified: true,
    });
    prisma.entity.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          name: string;
          type: EntityType;
          description?: string;
          logoUrl?: string;
        };
      }) =>
        Promise.resolve({
          id: 'entity-id',
          name: data.name,
          type: data.type,
          description: data.description,
          logoUrl: data.logoUrl,
          policy: { id: 'policy-id' },
        }),
    );

    await expect(
      service.createEntity('creator-id', {
        name: 'Family Fund',
        type: EntityType.FAMILY,
        description: 'Internal family fund',
      }),
    ).resolves.toMatchObject({
      id: 'entity-id',
      name: 'Family Fund',
      type: EntityType.FAMILY,
    });

    expect(prisma.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Family Fund',
        type: EntityType.FAMILY,
        description: 'Internal family fund',
        policy: { create: {} },
        ledgerAccount: { create: { type: LedgerAccountType.ENTITY } },
        memberships: {
          create: { personId: 'creator-id', role: MemberRole.FOUNDER },
        },
      }),
      include: { policy: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          personId: 'creator-id',
          entityId: 'entity-id',
          targetType: 'entities',
        }),
      }),
    );
  });

  it('applies a template as operational wallets, paths, policies, ledgers, and audits', async () => {
    prisma.person.findUnique.mockResolvedValue({
      id: 'creator-id',
      isVerified: true,
    });
    prisma.entityTemplate.findUnique.mockResolvedValue({
      id: 'template-id',
      name: 'Aid template',
      enabledModules: ['payments', 'decisions'],
      defaultPolicy: {
        requiresMemberApproval: true,
        allowedGovernanceTypes: [GovernancePathType.COMMITTEE],
      },
      defaultWallets: [
        {
          id: 'aid',
          name: 'Aid wallet',
          benefitType: WalletBenefitType.SEPARABLE,
          policy: { minimumActiveMonths: 1 },
        },
      ],
      defaultPaths: [
        {
          id: 'aid-committee',
          name: 'Aid committee',
          walletTempId: 'aid',
          type: GovernancePathType.COMMITTEE,
          spendingItems: [{ name: 'Medical aid', requiredDocuments: [] }],
        },
      ],
    });
    prisma.entity.create.mockImplementation(
      ({ data }: { data: { name: string; type: EntityType } }) =>
        Promise.resolve({
          id: 'entity-id',
          name: data.name,
          type: data.type,
          policy: { id: 'policy-id' },
        }),
    );
    prisma.wallet.create.mockResolvedValue({
      id: 'wallet-id',
      name: 'Aid wallet',
      benefitType: WalletBenefitType.SEPARABLE,
      policy: { id: 'wallet-policy-id' },
    });
    prisma.governancePath.create.mockResolvedValue({
      id: 'path-id',
      name: 'Aid committee',
      type: GovernancePathType.COMMITTEE,
      policy: { id: 'path-policy-id' },
      spendingItems: [{ id: 'spending-item-id', name: 'Medical aid' }],
    });

    await service.createEntity('creator-id', {
      name: 'Template fund',
      type: EntityType.COMMUNITY,
      templateId: 'template-id',
    });

    expect(prisma.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Template fund',
        templateId: 'template-id',
        enabledModules: ['payments', 'decisions'],
        policy: {
          create: expect.objectContaining({
            requiresMemberApproval: true,
            allowedGovernanceTypes: [GovernancePathType.COMMITTEE],
          }),
        },
      }),
      include: { policy: true },
    });
    expect(prisma.wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Aid wallet',
          benefitType: WalletBenefitType.SEPARABLE,
          policy: {
            create: expect.objectContaining({ minimumActiveMonths: 1 }),
          },
          ledgerAccount: {
            create: expect.objectContaining({ type: LedgerAccountType.WALLET }),
          },
        }),
        include: { policy: true },
      }),
    );
    expect(prisma.governancePath.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'wallet-id',
          name: 'Aid committee',
          type: GovernancePathType.COMMITTEE,
          policy: {
            create: expect.objectContaining({
              voteType: VoteType.COMMITTEE_APPROVAL,
            }),
          },
          ledgerAccount: {
            create: expect.objectContaining({ type: LedgerAccountType.PATH }),
          },
          spendingItems: {
            create: [
              expect.objectContaining({
                name: 'Medical aid',
                ledgerAccount: {
                  create: expect.objectContaining({
                    type: LedgerAccountType.SPENDING_ITEM,
                  }),
                },
              }),
            ],
          },
        }),
        include: { policy: true, spendingItems: true },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: 'wallets' }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: 'governance_paths' }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: 'spending_items' }),
      }),
    );
  });

  it('creates campaigns as parent-bound lifecycle records without template setup', async () => {
    const campaignEndsAt = '2100-01-15T00:00:00.000Z';
    prisma.entity.findUnique.mockResolvedValue({
      id: 'parent-id',
      isActive: true,
    });
    prisma.membership.findFirst.mockResolvedValue({ id: 'founder-member' });
    prisma.entity.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          name: string;
          type: EntityType;
          parentEntityId?: string;
          isCampaign?: boolean;
          campaignEndsAt?: Date | null;
        };
      }) =>
        Promise.resolve({
          id: 'campaign-id',
          name: data.name,
          type: data.type,
          parentEntityId: data.parentEntityId,
          isCampaign: data.isCampaign,
          campaignEndsAt: data.campaignEndsAt,
        }),
    );

    await expect(
      service.createCampaign('parent-id', 'creator-id', {
        name: 'Medical campaign',
        description: 'Temporary treatment support',
        campaignEndsAt,
      }),
    ).resolves.toMatchObject({
      id: 'campaign-id',
      name: 'Medical campaign',
      type: EntityType.CAMPAIGN,
      parentEntityId: 'parent-id',
      isCampaign: true,
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        entityId: 'parent-id',
        personId: 'creator-id',
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    expect(prisma.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Medical campaign',
        type: EntityType.CAMPAIGN,
        description: 'Temporary treatment support',
        parentEntityId: 'parent-id',
        isCampaign: true,
        policy: { create: {} },
        ledgerAccount: { create: { type: LedgerAccountType.ENTITY } },
        memberships: {
          create: { personId: 'creator-id', role: MemberRole.FOUNDER },
        },
      }),
    });
    expect(
      (
        prisma.entity.create.mock.calls[0][0] as {
          data: { campaignEndsAt: Date };
        }
      ).data.campaignEndsAt.toISOString(),
    ).toBe(campaignEndsAt);
    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(prisma.governancePath.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          personId: 'creator-id',
          entityId: 'campaign-id',
          targetType: 'entities',
          targetId: 'campaign-id',
          newValue: {
            name: 'Medical campaign',
            isCampaign: true,
            parentEntityId: 'parent-id',
          },
        }),
      }),
    );
  });

  it('rejects an invalid template before creating an entity', async () => {
    prisma.person.findUnique.mockResolvedValue({
      id: 'creator-id',
      isVerified: true,
    });
    prisma.entityTemplate.findUnique.mockResolvedValue({
      id: 'template-id',
      name: 'Legacy template',
      defaultPolicy: { requireApproval: true },
      defaultWallets: null,
      defaultPaths: null,
    });

    await expect(
      service.createEntity('creator-id', {
        name: 'Broken template fund',
        type: EntityType.COMMUNITY,
        templateId: 'template-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.entity.create).not.toHaveBeenCalled();
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

  it('strips immutable entity type from direct update service calls', async () => {
    prisma.membership.findFirst.mockResolvedValue({ id: 'admin-membership' });
    prisma.entity.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'entity-id',
          name: data.name,
          type: EntityType.FAMILY,
        }),
    );

    await service.updateEntity(
      'entity-id',
      'admin-id',
      {
        name: 'Updated Fund',
        type: EntityType.BUILDING,
      } as unknown as Parameters<EntitiesService['updateEntity']>[2],
    );

    expect(prisma.entity.update).toHaveBeenCalledWith({
      where: { id: 'entity-id' },
      data: { name: 'Updated Fund' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          newValue: { name: 'Updated Fund' },
        }),
      }),
    );
  });

  it('allows delegated advanced settings managers to update policy with risk metadata', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'advanced-settings-membership',
    });
    prisma.entityPolicy.findUnique.mockResolvedValue({
      id: 'policy-id',
      entityId: 'entity-id',
      version: 2,
      defaultVoteType: VoteType.SIMPLE_MAJORITY,
    });
    prisma.entityPolicy.update.mockResolvedValue({
      id: 'policy-id',
      entityId: 'entity-id',
      version: 3,
      defaultVoteType: VoteType.TWO_THIRDS,
    });
    prisma.membership.findMany.mockResolvedValue([{ personId: 'member-id' }]);

    await expect(
      service.updatePolicy('entity-id', 'delegated-id', {
        defaultVoteType: VoteType.TWO_THIRDS,
      }),
    ).resolves.toMatchObject({
      version: 3,
      defaultVoteType: VoteType.TWO_THIRDS,
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        entityId: 'entity-id',
        personId: 'delegated-id',
        isActive: true,
        OR: [
          { role: 'FOUNDER' },
          { canManageAdvancedSettings: true },
        ],
      },
      select: { id: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetType: 'entity_policies',
          newValue: expect.objectContaining({
            defaultVoteType: VoteType.TWO_THIRDS,
            changeRisk: 'GOVERNANCE_SENSITIVE',
          }),
        }),
      }),
    );
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
