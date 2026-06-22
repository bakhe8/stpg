import { MembershipApplicationStatus, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipApplicationsService } from './membership-applications.service';

describe('MembershipApplicationsService', () => {
  it('creates the active membership only when an admin approves the application', async () => {
    const tx = {
      membership: {
        upsert: jest.fn().mockResolvedValue({ id: 'membership-id' }),
      },
      membershipApplication: {
        update: jest.fn().mockResolvedValue({
          id: 'application-id',
          status: MembershipApplicationStatus.APPROVED,
        }),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      membershipApplication: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'application-id',
          personId: 'applicant-id',
          entityId: 'entity-id',
          requestedRole: MemberRole.MEMBER,
          status: MembershipApplicationStatus.PENDING,
          entity: { name: 'صندوق الاختبار' },
        }),
      },
      membership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'admin-membership-id',
          role: MemberRole.ADMIN,
        }),
      },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const service = new MembershipApplicationsService(
      prisma as unknown as PrismaService,
    );

    await service.approve(
      'application-id',
      'admin-id',
      'تم التحقق من البيانات',
    );

    expect(tx.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          personId_entityId: {
            personId: 'applicant-id',
            entityId: 'entity-id',
          },
        },
        create: expect.objectContaining({
          role: MemberRole.MEMBER,
        }),
      }),
    );
    expect(tx.membershipApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MembershipApplicationStatus.APPROVED,
          reviewedById: 'admin-id',
        }),
      }),
    );
    expect(tx.notification.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
