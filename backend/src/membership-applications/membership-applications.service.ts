import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  MemberRole,
  MembershipApplicationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(personId: string) {
    return this.prisma.membershipApplication.findMany({
      where: { personId },
      include: {
        entity: { select: { id: true, name: true, type: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findByEntity(entityId: string, reviewerId: string) {
    await this.requireAdminOrFounder(entityId, reviewerId);

    return this.prisma.membershipApplication.findMany({
      where: {
        entityId,
        status: {
          in: [
            MembershipApplicationStatus.PENDING,
            MembershipApplicationStatus.UNDER_REVIEW,
          ],
        },
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            username: true,
            phoneNumber: true,
            email: true,
            isVerified: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async approve(
    applicationId: string,
    reviewerId: string,
    reviewerNotes?: string,
  ) {
    const application = await this.getPendingApplication(applicationId);
    await this.requireAdminOrFounder(application.entityId, reviewerId);
    if (application.requestedRole === MemberRole.FOUNDER) {
      throw new BadRequestException(
        'لا يمكن منح دور المؤسس من خلال طلب انضمام',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.upsert({
        where: {
          personId_entityId: {
            personId: application.personId,
            entityId: application.entityId,
          },
        },
        update: {
          role: application.requestedRole,
          isActive: true,
          exitedAt: null,
          joinedAt: new Date(),
        },
        create: {
          personId: application.personId,
          entityId: application.entityId,
          role: application.requestedRole,
        },
      });

      const reviewed = await tx.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: MembershipApplicationStatus.APPROVED,
          reviewedById: reviewerId,
          reviewerNotes,
          reviewedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          personId: application.personId,
          type: 'MEMBERSHIP_APPLICATION_APPROVED',
          title: 'تم قبول طلب انضمامك',
          body: `أصبحت عضويتك في ${application.entity.name} فعّالة.`,
          targetType: 'ENTITY',
          targetId: application.entityId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.APPROVE,
          personId: reviewerId,
          entityId: application.entityId,
          targetType: 'membership_applications',
          targetId: applicationId,
          newValue: {
            status: MembershipApplicationStatus.APPROVED,
            membershipId: membership.id,
            reviewerNotes,
          },
        },
      });

      return { application: reviewed, membership };
    });
  }

  async reject(
    applicationId: string,
    reviewerId: string,
    reviewerNotes?: string,
  ) {
    const application = await this.getPendingApplication(applicationId);
    await this.requireAdminOrFounder(application.entityId, reviewerId);

    return this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: MembershipApplicationStatus.REJECTED,
          reviewedById: reviewerId,
          reviewerNotes,
          reviewedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          personId: application.personId,
          type: 'MEMBERSHIP_APPLICATION_REJECTED',
          title: 'تعذر قبول طلب الانضمام حاليًا',
          body:
            reviewerNotes ??
            `راجع إدارة ${application.entity.name} لمعرفة التفاصيل.`,
          targetType: 'ENTITY',
          targetId: application.entityId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.REJECT,
          personId: reviewerId,
          entityId: application.entityId,
          targetType: 'membership_applications',
          targetId: applicationId,
          newValue: {
            status: MembershipApplicationStatus.REJECTED,
            reviewerNotes,
          },
        },
      });

      return reviewed;
    });
  }

  async cancel(applicationId: string, personId: string) {
    const application = await this.prisma.membershipApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new NotFoundException('طلب الانضمام غير موجود');
    if (application.personId !== personId) {
      throw new ForbiddenException('يمكنك إلغاء طلبك فقط');
    }
    if (
      application.status !== MembershipApplicationStatus.PENDING &&
      application.status !== MembershipApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('لا يمكن إلغاء الطلب بعد صدور القرار');
    }

    return this.prisma.membershipApplication.update({
      where: { id: applicationId },
      data: { status: MembershipApplicationStatus.CANCELLED },
    });
  }

  private async getPendingApplication(applicationId: string) {
    const application = await this.prisma.membershipApplication.findUnique({
      where: { id: applicationId },
      include: { entity: { select: { name: true } } },
    });
    if (!application) throw new NotFoundException('طلب الانضمام غير موجود');
    if (
      application.status !== MembershipApplicationStatus.PENDING &&
      application.status !== MembershipApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('تمت مراجعة هذا الطلب مسبقًا');
    }
    return application;
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.FOUNDER, MemberRole.ADMIN] },
      },
    });
    if (!membership) {
      throw new ForbiddenException('مراجعة طلبات الانضمام للمدير والمؤسس فقط');
    }
  }
}
