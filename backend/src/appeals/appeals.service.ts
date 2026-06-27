import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AppealStatus,
  AuditAction,
  DecisionStatus,
  MemberRole,
  NotificationType,
  NotificationTargetType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toJsonValue } from '../prisma/json-value';
import { FileAppealDto } from './dto/file-appeal.dto';
import { RespondAppealDto } from './dto/respond-appeal.dto';

import { NotificationsService } from '../notifications/notifications.service';
import { RulesService } from '../rules/rules.service';
import { TenantContextService } from '../core/tenant-context/tenant-context.service';

@Injectable()
export class AppealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly rulesService: RulesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async fileAppeal(appellantId: string, dto: FileAppealDto) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
      include: {
        governancePath: {
          include: {
            wallet: { select: { entityId: true } },
            policy: true,
          },
        },
      },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');
    if (decision.status !== DecisionStatus.CLOSED) {
      throw new BadRequestException('يمكن الاعتراض فقط على القرارات المغلقة');
    }

    const entityId = decision.governancePath?.wallet?.entityId;
    if (!entityId) throw new BadRequestException('القرار غير مرتبط بكيان');

    await this.requireMember(entityId, appellantId);

    const appealRules = await this.rulesService.evaluateAppealRules({
      entityId,
      walletId: decision.governancePath?.walletId,
      pathId: decision.governancePathId,
      decisionType: decision.decisionType,
      appealType: dto.type,
      evidenceCount: dto.evidence?.length ?? 0,
      requestedAction: dto.requestedAction,
    });

    if (!appealRules.allowed) {
      throw new BadRequestException(appealRules.violations.join(' | '));
    }

    if (decision.governancePathId) {
      const policy = decision.governancePath?.policy;
      if (policy && !policy.allowAppeals) {
        throw new ForbiddenException(
          'سياسة المسار لا تسمح بالاعتراض على القرارات',
        );
      }
      if (policy?.appealWindowDays && decision.closedAt) {
        const windowEnd = new Date(decision.closedAt);
        windowEnd.setDate(windowEnd.getDate() + policy.appealWindowDays);
        if (new Date() > windowEnd) {
          throw new BadRequestException('انتهت مهلة الاعتراض على هذا القرار');
        }
      }
    }

    const existingAppeal = await this.prisma.appeal.findFirst({
      where: { decisionId: dto.decisionId, appealedById: appellantId },
    });
    if (existingAppeal) {
      throw new ConflictException('لديك اعتراض مسبق على هذا القرار');
    }

    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 14);

    const policyVersionId = await this.resolvePolicyVersionId(
      appellantId,
      entityId,
      decision.governancePathId,
    );

    const appeal = await this.prisma.appeal.create({
      data: {
        decisionId: dto.decisionId,
        appealedById: appellantId,
        policyVersionId,
        type: dto.type,
        reason: dto.reason,
        evidence: dto.evidence ?? [],
        requestedAction: dto.requestedAction,
        status: AppealStatus.OPEN,
        responseDeadline,
      },
      include: {
        appealedBy: { select: { id: true, name: true } },
        decision: { select: { id: true, title: true, decisionType: true } },
        policyVersion: { select: { id: true, version: true, createdAt: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: appellantId,
        entityId,
        targetType: 'appeals',
        targetId: appeal.id,
        newValue: {
          type: dto.type,
          decisionId: dto.decisionId,
          policyVersionId,
        },
      },
    });

    return appeal;
  }

  async findById(id: string, requesterId: string) {
    await this.autoEscalateOverdueAppeals({ appealId: id });

    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
      include: {
        appealedBy: { select: { id: true, name: true } },
        decision: {
          include: {
            governancePath: {
              include: { wallet: { select: { entityId: true } } },
            },
          },
        },
        policyVersion: { select: { id: true, version: true, createdAt: true } },
      },
    });
    if (!appeal) throw new NotFoundException('الاعتراض غير موجود');

    const entityId = appeal.decision.governancePath?.wallet?.entityId;
    if (entityId) await this.requireMember(entityId, requesterId);

    return appeal;
  }

  async findDecisionAppeals(decisionId: string, requesterId: string) {
    await this.autoEscalateOverdueAppeals({ decisionId });

    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: {
        governancePath: { include: { wallet: { select: { entityId: true } } } },
      },
    });
    if (!decision) throw new NotFoundException('القرار غير موجود');

    const entityId = decision.governancePath?.wallet?.entityId;
    if (entityId) await this.requireMember(entityId, requesterId);

    return this.prisma.appeal.findMany({
      where: { decisionId },
      include: {
        appealedBy: { select: { id: true, name: true } },
        policyVersion: { select: { id: true, version: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToAppeal(id: string, reviewerId: string, dto: RespondAppealDto) {
    await this.autoEscalateOverdueAppeals({ appealId: id });

    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
      include: {
        decision: {
          include: {
            governancePath: {
              include: { wallet: { select: { entityId: true } } },
            },
          },
        },
      },
    });
    if (!appeal) throw new NotFoundException('الاعتراض غير موجود');
    if (appeal.status === AppealStatus.CLOSED) {
      throw new BadRequestException('الاعتراض مغلق بالفعل');
    }

    const entityId = appeal.decision.governancePath?.wallet?.entityId;
    if (!entityId) throw new BadRequestException('الاعتراض غير مرتبط بكيان');

    await this.requireAdminOrFounder(entityId, reviewerId);

    const updated = await this.prisma.appeal.update({
      where: { id },
      data: {
        status: dto.status,
        reviewerNotes: dto.reviewerNotes,
        reviewerId,
        respondedAt: new Date(),
        closedAt: dto.status === AppealStatus.CLOSED ? new Date() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: reviewerId,
        entityId,
        targetType: 'appeals',
        targetId: id,
        newValue: { status: dto.status, reviewerNotes: dto.reviewerNotes },
      },
    });

    return updated;
  }

  async escalateOverdueAppeals() {
    return this.tenantContext.runInternal(() =>
      this.autoEscalateOverdueAppeals({}),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoEscalationCron() {
    await this.tenantContext.runInternal(() =>
      this.autoEscalateOverdueAppeals({}),
    );
  }

  private async autoEscalateOverdueAppeals(filter: {
    appealId?: string;
    decisionId?: string;
  }) {
    const overdueAppeals = await this.prisma.appeal.findMany({
      where: {
        ...(filter.appealId ? { id: filter.appealId } : {}),
        ...(filter.decisionId ? { decisionId: filter.decisionId } : {}),
        status: { in: [AppealStatus.OPEN, AppealStatus.UNDER_REVIEW] },
        responseDeadline: { lt: new Date() },
      },
      include: {
        decision: {
          include: {
            governancePath: {
              include: { wallet: { select: { entityId: true } } },
            },
          },
        },
      },
    });

    let escalatedCount = 0;
    for (const appeal of overdueAppeals) {
      const entityId = appeal.decision.governancePath?.wallet?.entityId;

      await this.prisma.appeal.update({
        where: { id: appeal.id },
        data: { status: AppealStatus.ESCALATED },
      });

      if (entityId) {
        await this.prisma.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            entityId,
            targetType: 'appeals',
            targetId: appeal.id,
            newValue: {
              status: AppealStatus.ESCALATED,
              autoEscalated: true,
              responseDeadline: appeal.responseDeadline.toISOString(),
            },
          },
        });

        // Notify admins
        const admins = await this.prisma.membership.findMany({
          where: {
            entityId,
            isActive: true,
            role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
          },
          select: { personId: true },
        });

        const notifyAdmins = admins.map((a) => ({
          personId: a.personId,
          type: NotificationType.APPEAL_UPDATE,
          title: 'تم تصعيد اعتراض تلقائياً',
          body: `الاعتراض تجاوز مهلة الرد المحددة وتم تصعيده تلقائياً.`,
          targetType: NotificationTargetType.APPEAL,
          targetId: appeal.id,
        }));

        await this.notificationsService.createBulk([
          ...notifyAdmins,
          {
            personId: appeal.appealedById,
            type: NotificationType.APPEAL_UPDATE,
            title: 'تم تصعيد اعتراضك تلقائياً',
            body: `تجاوز اعتراضك المهلة المحددة للرد وتم تصعيده لجهة أعلى.`,
            targetType: NotificationTargetType.APPEAL,
            targetId: appeal.id,
          },
        ]);
      }

      escalatedCount += 1;
    }

    return { escalatedCount };
  }

  private async resolvePolicyVersionId(
    actorId: string,
    entityId: string,
    governancePathId: string | null,
  ) {
    if (governancePathId) {
      const policy = await this.prisma.pathPolicy.findUnique({
        where: { governancePathId },
      });
      const policyVersionId = await this.ensurePolicyVersion(actorId, {
        pathPolicyId: policy?.id ?? null,
        snapshot: policy,
        reason: 'snapshot_for_appeal_context',
      });
      if (policyVersionId) {
        return policyVersionId;
      }
    }

    const entityPolicy = await this.prisma.entityPolicy.findUnique({
      where: { entityId },
    });
    return this.ensurePolicyVersion(actorId, {
      entityPolicyId: entityPolicy?.id ?? null,
      snapshot: entityPolicy,
      reason: 'snapshot_for_appeal_context',
    });
  }

  private async ensurePolicyVersion(
    actorId: string,
    policy: {
      entityPolicyId?: string | null;
      pathPolicyId?: string | null;
      snapshot: { version: number } | null;
      reason: string;
    },
  ) {
    if (!policy.snapshot) {
      return null;
    }

    const existing = await this.prisma.policyVersion.findFirst({
      where: {
        entityPolicyId: policy.entityPolicyId ?? undefined,
        pathPolicyId: policy.pathPolicyId ?? undefined,
        version: policy.snapshot.version,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.policyVersion.create({
      data: {
        entityPolicyId: policy.entityPolicyId ?? undefined,
        pathPolicyId: policy.pathPolicyId ?? undefined,
        version: policy.snapshot.version,
        snapshot: toJsonValue(policy.snapshot),
        changedById: actorId,
        changeReason: policy.reason,
      },
      select: { id: true },
    });
    return created.id;
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً');
  }
}
