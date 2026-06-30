import {
  EntityPlatformStatus,
  EntityType,
  MemberRole,
  WalletBenefitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkSurfaceService } from './work-surface.service';

type WorkSurfacePrivate = {
  hasAdvancedSettingsAccess(memberships: unknown[]): boolean;
  hasSharedBenefitSignal(membership: unknown): boolean;
};

function baseMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-id',
    personId: 'person-id',
    entityId: 'entity-id',
    role: MemberRole.MEMBER,
    canManageAdvancedSettings: false,
    isActive: true,
    entity: {
      id: 'entity-id',
      name: 'Fund',
      type: EntityType.FAMILY,
      isActive: true,
      isCampaign: false,
      platformStatus: EntityPlatformStatus.ACTIVE,
      wallets: [],
    },
    committeeMembers: [],
    subscriptions: [],
    ...overrides,
  };
}

describe('WorkSurfaceService classification helpers', () => {
  let service: WorkSurfacePrivate;

  beforeEach(() => {
    service = new WorkSurfaceService(
      {} as unknown as PrismaService,
    ) as unknown as WorkSurfacePrivate;
  });

  it('detects shared benefit from active wallet benefit type instead of entity type only', () => {
    const membership = baseMembership({
      entity: {
        id: 'entity-id',
        name: 'Family Fund',
        type: EntityType.FAMILY,
        isActive: true,
        isCampaign: false,
        platformStatus: EntityPlatformStatus.ACTIVE,
        wallets: [
          { benefitType: WalletBenefitType.SHARED, isActive: true },
        ],
      },
    });

    expect(service.hasSharedBenefitSignal(membership)).toBe(true);
  });

  it('keeps BUILDING as compatibility fallback for existing data', () => {
    const membership = baseMembership({
      entity: {
        id: 'entity-id',
        name: 'Building Fund',
        type: EntityType.BUILDING,
        isActive: true,
        isCampaign: false,
        platformStatus: EntityPlatformStatus.ACTIVE,
        wallets: [],
      },
    });

    expect(service.hasSharedBenefitSignal(membership)).toBe(true);
  });

  it('does not treat a broad admin role as advanced settings access', () => {
    expect(
      service.hasAdvancedSettingsAccess([
        baseMembership({ role: MemberRole.ADMIN }),
      ]),
    ).toBe(false);
    expect(
      service.hasAdvancedSettingsAccess([
        baseMembership({ canManageAdvancedSettings: true }),
      ]),
    ).toBe(true);
  });
});
