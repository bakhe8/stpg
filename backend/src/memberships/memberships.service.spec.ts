import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditAction, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  let prisma: {
    membership: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let service: MembershipsService;

  beforeEach(() => {
    prisma = {
      membership: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new MembershipsService(prisma as unknown as PrismaService);
  });

  it('lets a founder delegate advanced settings access to an active non-founder member', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'member-membership',
      entityId: 'entity-id',
      personId: 'member-id',
      role: MemberRole.ADMIN,
      isActive: true,
      canManageAdvancedSettings: false,
    });
    prisma.membership.findFirst.mockResolvedValue({ id: 'founder-membership' });
    prisma.membership.update.mockResolvedValue({
      id: 'member-membership',
      canManageAdvancedSettings: true,
    });

    await expect(
      service.updateAdvancedSettingsAccess(
        'member-membership',
        'founder-id',
        { canManageAdvancedSettings: true },
      ),
    ).resolves.toMatchObject({ canManageAdvancedSettings: true });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        entityId: 'entity-id',
        personId: 'founder-id',
        isActive: true,
        role: MemberRole.FOUNDER,
      },
    });
    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: 'member-membership' },
      data: { canManageAdvancedSettings: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditAction.UPDATE,
        personId: 'founder-id',
        entityId: 'entity-id',
        targetType: 'memberships',
        targetId: 'member-membership',
        oldValue: { canManageAdvancedSettings: false },
        newValue: { canManageAdvancedSettings: true },
      },
    });
  });

  it('does not let a non-founder delegate advanced settings access', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: 'member-membership',
      entityId: 'entity-id',
      role: MemberRole.ADMIN,
      isActive: true,
      canManageAdvancedSettings: false,
    });
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.updateAdvancedSettingsAccess(
        'member-membership',
        'admin-id',
        { canManageAdvancedSettings: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it('rejects delegating inactive or founder memberships', async () => {
    prisma.membership.findFirst.mockResolvedValue({ id: 'founder-membership' });
    prisma.membership.findUnique.mockResolvedValueOnce({
      id: 'inactive-membership',
      entityId: 'entity-id',
      role: MemberRole.MEMBER,
      isActive: false,
      canManageAdvancedSettings: false,
    });

    await expect(
      service.updateAdvancedSettingsAccess(
        'inactive-membership',
        'founder-id',
        { canManageAdvancedSettings: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.membership.findUnique.mockResolvedValueOnce({
      id: 'founder-membership',
      entityId: 'entity-id',
      role: MemberRole.FOUNDER,
      isActive: true,
      canManageAdvancedSettings: false,
    });

    await expect(
      service.updateAdvancedSettingsAccess(
        'founder-membership',
        'founder-id',
        { canManageAdvancedSettings: false },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
