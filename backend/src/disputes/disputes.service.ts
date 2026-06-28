import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, DisputeStatus, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toJsonValue } from '../prisma/json-value';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import {
  ResolveDisputeDto,
  AssignArbitratorDto,
} from './dto/resolve-dispute.dto';
import { RulesService } from '../rules/rules.service';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
  ) {}

  async openDispute(initiatorId: string, dto: OpenDisputeDto) {
    await this.requireMember(dto.entityId, initiatorId);

    let walletId = dto.walletId ?? null;
    let governancePathId = dto.governancePathId ?? null;
    const disbursementRequestId = dto.disbursementRequestId ?? null;

    if (walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
        select: { entityId: true },
      });
      if (!wallet) {
        throw new NotFoundException('المحفظة غير موجودة');
      }
      if (wallet.entityId !== dto.entityId) {
        throw new BadRequestException('المحفظة لا تنتمي إلى الكيان المحدد');
      }
    }

    if (governancePathId) {
      const path = await this.prisma.governancePath.findUnique({
        where: { id: governancePathId },
        select: {
          walletId: true,
          wallet: { select: { entityId: true } },
        },
      });
      if (!path) {
        throw new NotFoundException('مسار الحوكمة غير موجود');
      }
      if (path.wallet.entityId !== dto.entityId) {
        throw new BadRequestException(
          'مسار الحوكمة لا ينتمي إلى الكيان المحدد',
        );
      }
      if (walletId && path.walletId !== walletId) {
        throw new BadRequestException(
          'مسار الحوكمة لا ينتمي إلى المحفظة المحددة',
        );
      }
      walletId = path.walletId;
    }

    if (dto.respondentId) {
      const respondentMember = await this.prisma.membership.findFirst({
        where: {
          entityId: dto.entityId,
          personId: dto.respondentId,
          isActive: true,
        },
      });
      if (!respondentMember) {
        throw new BadRequestException('المستجيب ليس عضواً في هذا الكيان');
      }
    }

    if (dto.linkedAppealId) {
      const appeal = await this.prisma.appeal.findUnique({
        where: { id: dto.linkedAppealId },
        select: {
          decision: {
            select: {
              governancePathId: true,
              governancePath: {
                select: {
                  walletId: true,
                  wallet: { select: { entityId: true } },
                },
              },
            },
          },
        },
      });
      if (!appeal) {
        throw new NotFoundException('الاعتراض المرتبط غير موجود');
      }

      const appealEntityId = appeal.decision.governancePath?.wallet.entityId;
      if (appealEntityId && appealEntityId !== dto.entityId) {
        throw new BadRequestException(
          'الاعتراض المرتبط لا ينتمي إلى هذا الكيان',
        );
      }
      if (governancePathId && appeal.decision.governancePathId) {
        if (governancePathId !== appeal.decision.governancePathId) {
          throw new BadRequestException(
            'الاعتراض المرتبط لا ينتمي إلى مسار الحوكمة المحدد',
          );
        }
      } else if (governancePathId && !appeal.decision.governancePathId) {
        throw new BadRequestException('الاعتراض المرتبط غير مربوط بمسار حوكمة');
      } else {
        governancePathId = appeal.decision.governancePathId;
      }

      if (walletId && appeal.decision.governancePath?.walletId) {
        if (walletId !== appeal.decision.governancePath.walletId) {
          throw new BadRequestException(
            'الاعتراض المرتبط لا ينتمي إلى المحفظة المحددة',
          );
        }
      } else if (!walletId) {
        walletId = appeal.decision.governancePath?.walletId ?? walletId;
      }
    }

    if (disbursementRequestId) {
      const disbursementRequest =
        await this.prisma.disbursementRequest.findUnique({
          where: { id: disbursementRequestId },
          select: {
            id: true,
            governancePathId: true,
            governancePath: {
              select: {
                walletId: true,
                wallet: { select: { entityId: true } },
              },
            },
          },
        });
      if (!disbursementRequest) {
        throw new NotFoundException('طلب الصرف المرتبط غير موجود');
      }
      if (disbursementRequest.governancePath.wallet.entityId !== dto.entityId) {
        throw new BadRequestException(
          'طلب الصرف المرتبط لا ينتمي إلى هذا الكيان',
        );
      }
      if (
        governancePathId &&
        governancePathId !== disbursementRequest.governancePathId
      ) {
        throw new BadRequestException(
          'طلب الصرف المرتبط لا ينتمي إلى مسار الحوكمة المحدد',
        );
      }
      if (walletId && walletId !== disbursementRequest.governancePath.walletId) {
        throw new BadRequestException(
          'طلب الصرف المرتبط لا ينتمي إلى المحفظة المحددة',
        );
      }
      governancePathId = disbursementRequest.governancePathId;
      walletId = disbursementRequest.governancePath.walletId;
    }

    const disputeRules = await this.rulesService.evaluateDisputeRules({
      entityId: dto.entityId,
      walletId,
      pathId: governancePathId,
      disputeType: dto.type,
      evidenceCount: dto.evidence?.length ?? 0,
      hasRespondent: Boolean(dto.respondentId),
      hasLinkedAppeal: Boolean(dto.linkedAppealId),
    });

    if (!disputeRules.allowed) {
      throw new BadRequestException(disputeRules.violations.join(' | '));
    }

    const policyVersionId = await this.resolvePolicyVersionId(
      initiatorId,
      dto.entityId,
      walletId,
      governancePathId,
    );

    const dispute = await this.prisma.dispute.create({
      data: {
        entityId: dto.entityId,
        walletId,
        governancePathId,
        initiatorId,
        respondentId: dto.respondentId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        evidence: dto.evidence ?? [],
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        status: DisputeStatus.OPEN,
        linkedAppealId: dto.linkedAppealId,
        disbursementRequestId,
        policyVersionId,
      },
      include: {
        policyVersion: { select: { id: true, version: true, createdAt: true } },
        disbursementRequest: {
          select: {
            id: true,
            status: true,
            amount: true,
            beneficiaryName: true,
            governancePathId: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: initiatorId,
        entityId: dto.entityId,
        targetType: 'disputes',
        targetId: dispute.id,
        newValue: {
          type: dto.type,
          title: dto.title,
          walletId,
          governancePathId,
          linkedAppealId: dto.linkedAppealId,
          disbursementRequestId,
          policyVersionId,
        },
      },
    });

    return dispute;
  }

  async findById(id: string, requesterId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        policyVersion: { select: { id: true, version: true, createdAt: true } },
      },
    });
    if (!dispute) throw new NotFoundException('النزاع غير موجود');

    const canView =
      dispute.initiatorId === requesterId ||
      dispute.respondentId === requesterId ||
      dispute.arbitratorId === requesterId ||
      (await this.isAdminOrAuditor(dispute.entityId, requesterId));

    if (!canView)
      throw new ForbiddenException('ليس لديك صلاحية رؤية هذا النزاع');

    return dispute;
  }

  async findEntityDisputes(entityId: string, requesterId: string) {
    await this.requireAdminOrAuditor(entityId, requesterId);

    return this.prisma.dispute.findMany({
      where: { entityId },
      include: {
        policyVersion: { select: { id: true, version: true, createdAt: true } },
        disbursementRequest: {
          select: {
            id: true,
            status: true,
            amount: true,
            beneficiaryName: true,
            governancePathId: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findMyDisputes(personId: string) {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          { initiatorId: personId },
          { respondentId: personId },
          { arbitratorId: personId },
        ],
      },
      include: {
        policyVersion: { select: { id: true, version: true, createdAt: true } },
        disbursementRequest: {
          select: {
            id: true,
            status: true,
            amount: true,
            beneficiaryName: true,
            governancePathId: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async assignArbitrator(
    id: string,
    adminId: string,
    dto: AssignArbitratorDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (
      dispute.status === DisputeStatus.CLOSED ||
      dispute.status === DisputeStatus.RESOLVED
    ) {
      throw new BadRequestException('النزاع مغلق أو محسوم بالفعل');
    }

    await this.requireAdminOrFounder(dispute.entityId, adminId);

    const arbitratorMember = await this.prisma.membership.findFirst({
      where: {
        entityId: dispute.entityId,
        personId: dto.arbitratorId,
        isActive: true,
        role: {
          in: [
            MemberRole.AUDITOR,
            MemberRole.ADMIN,
            MemberRole.FOUNDER,
            MemberRole.COMMITTEE_MEMBER,
          ],
        },
      },
    });
    if (!arbitratorMember) {
      throw new BadRequestException(
        'المحكّم يجب أن يكون مراجعاً أو عضو لجنة أو مديراً في الكيان',
      );
    }

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        arbitratorId: dto.arbitratorId,
        status: DisputeStatus.UNDER_MEDIATION,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: dispute.entityId,
        targetType: 'disputes',
        targetId: id,
        newValue: { arbitratorId: dto.arbitratorId, status: 'UNDER_MEDIATION' },
      },
    });

    return updated;
  }

  async resolve(id: string, requesterId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (
      dispute.status === DisputeStatus.CLOSED ||
      dispute.status === DisputeStatus.RESOLVED
    ) {
      throw new BadRequestException('النزاع محسوم أو مغلق بالفعل');
    }

    const isArbitrator = dispute.arbitratorId === requesterId;
    const isAdmin = await this.isAdminOrFounder(dispute.entityId, requesterId);
    if (!isArbitrator && !isAdmin) {
      throw new ForbiddenException('فقط المحكّم أو المدير يمكنه إغلاق النزاع');
    }

    const isClosed =
      dto.status === DisputeStatus.CLOSED ||
      dto.status === DisputeStatus.RESOLVED;

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        arbitratorNotes: dto.arbitratorNotes,
        resolution: dto.resolution,
        status: dto.status,
        closedAt: isClosed ? new Date() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: requesterId,
        entityId: dispute.entityId,
        targetType: 'disputes',
        targetId: id,
        newValue: { status: dto.status, resolution: dto.resolution },
      },
    });

    return updated;
  }

  async escalate(id: string, adminId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (dispute.status === DisputeStatus.ESCALATED) {
      throw new BadRequestException('النزاع مصعّد بالفعل');
    }

    await this.requireAdminOrFounder(dispute.entityId, adminId);

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status: DisputeStatus.ESCALATED },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: dispute.entityId,
        targetType: 'disputes',
        targetId: id,
        newValue: { status: 'ESCALATED' },
      },
    });

    return updated;
  }

  private async resolvePolicyVersionId(
    actorId: string,
    entityId: string,
    walletId: string | null,
    governancePathId: string | null,
  ) {
    if (governancePathId) {
      const policy = await this.prisma.pathPolicy.findUnique({
        where: { governancePathId },
      });
      return this.ensurePolicyVersion(actorId, {
        pathPolicyId: policy?.id ?? null,
        snapshot: policy,
      });
    }

    if (walletId) {
      const policy = await this.prisma.walletPolicy.findUnique({
        where: { walletId },
      });
      return this.ensurePolicyVersion(actorId, {
        walletPolicyId: policy?.id ?? null,
        snapshot: policy,
      });
    }

    const policy = await this.prisma.entityPolicy.findUnique({
      where: { entityId },
    });
    return this.ensurePolicyVersion(actorId, {
      entityPolicyId: policy?.id ?? null,
      snapshot: policy,
    });
  }

  private async ensurePolicyVersion(
    actorId: string,
    policy: {
      entityPolicyId?: string | null;
      walletPolicyId?: string | null;
      pathPolicyId?: string | null;
      snapshot: { version: number } | null;
    },
  ) {
    if (!policy.snapshot) {
      return null;
    }

    const existing = await this.prisma.policyVersion.findFirst({
      where: {
        entityPolicyId: policy.entityPolicyId ?? undefined,
        walletPolicyId: policy.walletPolicyId ?? undefined,
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
        walletPolicyId: policy.walletPolicyId ?? undefined,
        pathPolicyId: policy.pathPolicyId ?? undefined,
        version: policy.snapshot.version,
        snapshot: toJsonValue(policy.snapshot),
        changedById: actorId,
        changeReason: 'snapshot_for_dispute_context',
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

  private async requireAdminOrAuditor(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.ADMIN, MemberRole.FOUNDER, MemberRole.AUDITOR],
        },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو مراجعاً');
  }

  private async isAdminOrFounder(
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    return !!(await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.ADMIN, MemberRole.FOUNDER, MemberRole.AUDITOR],
        },
      },
    }));
  }

  private async isAdminOrAuditor(
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    return !!(await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.ADMIN, MemberRole.FOUNDER, MemberRole.AUDITOR],
        },
      },
    }));
  }
}
