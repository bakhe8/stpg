import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RulesService } from '../rules/rules.service';
import {
  AuditAction,
  EntityRelationshipType,
  RelationshipStatus,
  MemberRole,
} from '@prisma/client';
import { CreateEntityRelationshipDto } from './dto/create-entity-relationship.dto';
import { UpdateEntityRelationshipDto } from './dto/update-entity-relationship.dto';
import { toJsonValue } from '../prisma/json-value';

@Injectable()
export class EntityRelationshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly rulesService: RulesService,
  ) {}

  async createRelationship(
    creatorId: string,
    dto: CreateEntityRelationshipDto,
  ) {
    if (dto.sourceEntityId === dto.targetEntityId) {
      throw new BadRequestException('لا يمكن ربط الكيان بنفسه');
    }

    // يجب أن يكون المنشئ مسؤولاً في الكيان المصدر
    await this.requireAdminOrFounder(dto.sourceEntityId, creatorId);

    // التحقق من سياسة الكيانين
    const [sourcePolicy, targetPolicy] = await Promise.all([
      this.prisma.entityPolicy.findUnique({
        where: { entityId: dto.sourceEntityId },
      }),
      this.prisma.entityPolicy.findUnique({
        where: { entityId: dto.targetEntityId },
      }),
    ]);

    if (!sourcePolicy?.allowEntityRelations) {
      throw new ForbiddenException(
        'سياسة الكيان المصدر لا تسمح بالعلاقات مع كيانات أخرى',
      );
    }
    if (!targetPolicy?.allowEntityRelations) {
      throw new ForbiddenException(
        'سياسة الكيان الهدف لا تسمح بالعلاقات مع كيانات أخرى',
      );
    }

    const symmetricTypes: EntityRelationshipType[] = [
      EntityRelationshipType.MEMBERSHIP_OVERLAP,
      EntityRelationshipType.SHARED_WALLET,
      EntityRelationshipType.MERGER,
      EntityRelationshipType.REPORT_SHARING,
    ];
    const existingRel = await this.prisma.entityRelationship.findFirst({
      where: {
        type: dto.type,
        isActive: true,
        OR: symmetricTypes.includes(dto.type)
          ? [
              {
                sourceEntityId: dto.sourceEntityId,
                targetEntityId: dto.targetEntityId,
              },
              {
                sourceEntityId: dto.targetEntityId,
                targetEntityId: dto.sourceEntityId,
              },
            ]
          : [
              {
                sourceEntityId: dto.sourceEntityId,
                targetEntityId: dto.targetEntityId,
              },
            ],
      },
    });
    if (existingRel) {
      throw new ConflictException(
        'علاقة من هذا النوع موجودة بالفعل بين الكيانين',
      );
    }

    const rulesResult = await this.rulesService.evaluateRelationshipRules({
      sourceEntityId: dto.sourceEntityId,
      targetEntityId: dto.targetEntityId,
      relationshipType: dto.type,
    });
    if (!rulesResult.allowed) {
      throw new BadRequestException(
        `يخالف نوع العلاقة القواعد المحددة: ${rulesResult.violations.join('؛ ')}`,
      );
    }

    const relationship = await this.prisma.$transaction(async (tx) => {
      const rel = await tx.entityRelationship.create({
        data: {
          sourceEntityId: dto.sourceEntityId,
          targetEntityId: dto.targetEntityId,
          type: dto.type,
          terms: toJsonValue(dto.terms ?? {}),
          approvalStatus: RelationshipStatus.PENDING,
          isActive: false,
        },
        include: {
          sourceEntity: { select: { id: true, name: true, type: true } },
          targetEntity: { select: { id: true, name: true, type: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: creatorId,
          entityId: dto.sourceEntityId,
          targetType: 'entity_relationships',
          targetId: rel.id,
          newValue: {
            type: dto.type,
            targetEntityId: dto.targetEntityId,
            approvalStatus: 'PENDING',
          },
        },
      });

      return rel;
    });

    // إشعار مسؤولي الكيان الهدف بطلب الربط
    void this.notificationsService
      .notifyRelationshipRequest(
        dto.targetEntityId,
        relationship.sourceEntity.name,
        relationship.id,
      )
      .catch(() => {});

    return relationship;
  }

  async approveRelationship(id: string, approverId: string) {
    const rel = await this.prisma.entityRelationship.findUnique({
      where: { id },
    });
    if (!rel) throw new NotFoundException('العلاقة غير موجودة');
    if (rel.approvalStatus !== RelationshipStatus.PENDING) {
      throw new ConflictException('العلاقة لم تعد في حالة الانتظار');
    }

    // يجب أن يكون المُعتمِد مسؤولاً في الكيان الهدف
    await this.requireAdminOrFounder(rel.targetEntityId, approverId);

    const updated = await this.prisma.entityRelationship.update({
      where: { id },
      data: {
        approvalStatus: RelationshipStatus.ACTIVE,
        approvedById: approverId,
        approvedAt: new Date(),
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.APPROVE,
        personId: approverId,
        entityId: rel.targetEntityId,
        targetType: 'entity_relationships',
        targetId: id,
        newValue: { approvalStatus: 'ACTIVE' },
      },
    });

    const targetEntity = await this.prisma.entity.findUnique({
      where: { id: rel.targetEntityId },
      select: { name: true },
    });

    void this.notificationsService
      .notifyRelationshipApproved(
        rel.sourceEntityId,
        targetEntity?.name ?? 'الكيان الهدف',
        rel.id,
      )
      .catch(() => {});

    return updated;
  }

  async rejectRelationship(id: string, rejecterId: string) {
    const rel = await this.prisma.entityRelationship.findUnique({
      where: { id },
    });
    if (!rel) throw new NotFoundException('العلاقة غير موجودة');
    if (rel.approvalStatus !== RelationshipStatus.PENDING) {
      throw new ConflictException('العلاقة لم تعد في حالة الانتظار');
    }

    await this.requireAdminOrFounder(rel.targetEntityId, rejecterId);

    const updated = await this.prisma.entityRelationship.update({
      where: { id },
      data: {
        approvalStatus: RelationshipStatus.REJECTED,
        isActive: false,
        endedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.REJECT,
        personId: rejecterId,
        entityId: rel.targetEntityId,
        targetType: 'entity_relationships',
        targetId: id,
        newValue: { approvalStatus: 'REJECTED' },
      },
    });

    return updated;
  }

  async findEntityRelationships(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const [outgoing, incoming] = await Promise.all([
      this.prisma.entityRelationship.findMany({
        where: { sourceEntityId: entityId },
        include: {
          targetEntity: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entityRelationship.findMany({
        where: { targetEntityId: entityId },
        include: {
          sourceEntity: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { outgoing, incoming };
  }

  async findById(id: string, requesterId: string) {
    const rel = await this.prisma.entityRelationship.findUnique({
      where: { id },
      include: {
        sourceEntity: { select: { id: true, name: true, type: true } },
        targetEntity: { select: { id: true, name: true, type: true } },
      },
    });
    if (!rel) throw new NotFoundException('العلاقة غير موجودة');

    const isMemberOfSource = await this.isMember(
      rel.sourceEntityId,
      requesterId,
    );
    const isMemberOfTarget = await this.isMember(
      rel.targetEntityId,
      requesterId,
    );
    if (!isMemberOfSource && !isMemberOfTarget) {
      throw new ForbiddenException('ليس لديك صلاحية رؤية هذه العلاقة');
    }

    return rel;
  }

  async updateRelationship(
    id: string,
    adminId: string,
    dto: UpdateEntityRelationshipDto,
  ) {
    const rel = await this.prisma.entityRelationship.findUnique({
      where: { id },
    });
    if (!rel) throw new NotFoundException('العلاقة غير موجودة');

    const isSourceAdmin = await this.isAdminOrFounder(
      rel.sourceEntityId,
      adminId,
    );
    const isTargetAdmin = await this.isAdminOrFounder(
      rel.targetEntityId,
      adminId,
    );
    if (!isSourceAdmin && !(isTargetAdmin && dto.isActive === false)) {
      throw new ForbiddenException(
        'التعديل للطرف المصدر، ويحق للطرف الهدف إنهاء العلاقة فقط',
      );
    }

    const updated = await this.prisma.entityRelationship.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        terms: dto.terms ? toJsonValue(dto.terms) : undefined,
        endedAt: dto.isActive === false ? new Date() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: rel.sourceEntityId,
        targetType: 'entity_relationships',
        targetId: id,
        newValue: { isActive: dto.isActive },
        oldValue: { isActive: rel.isActive },
      },
    });

    return updated;
  }

  // ── تقرير التداخل: الأعضاء المشتركين بين الكيانين ──────────────
  async getOverlapReport(entityId: string, requesterId: string) {
    await this.requireAdminOrFounder(entityId, requesterId);

    // الكيانات المرتبطة
    const relationships = await this.prisma.entityRelationship.findMany({
      where: {
        OR: [
          { sourceEntityId: entityId, isActive: true },
          { targetEntityId: entityId, isActive: true },
        ],
        type: EntityRelationshipType.MEMBERSHIP_OVERLAP,
      },
      select: {
        id: true,
        type: true,
        sourceEntityId: true,
        targetEntityId: true,
        sourceEntity: { select: { id: true, name: true } },
        targetEntity: { select: { id: true, name: true } },
      },
    });

    const relatedEntityIds = relationships.map((r) =>
      r.sourceEntityId === entityId ? r.targetEntityId : r.sourceEntityId,
    );

    if (relatedEntityIds.length === 0) {
      return { entityId, overlaps: [] };
    }

    // أعضاء الكيان الحالي
    const myMembers = await this.prisma.membership.findMany({
      where: { entityId, isActive: true },
      select: {
        personId: true,
        person: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    const myMemberIds = new Set(myMembers.map((m) => m.personId));

    // تحقق من التداخل مع كل كيان مرتبط
    const overlaps = await Promise.all(
      relatedEntityIds.map(async (relatedId) => {
        const sharedMembers = await this.prisma.membership.findMany({
          where: {
            entityId: relatedId,
            isActive: true,
            personId: { in: Array.from(myMemberIds) },
          },
          include: {
            person: { select: { id: true, name: true } },
          },
        });

        const relInfo = relationships.find(
          (r) =>
            r.sourceEntityId === relatedId || r.targetEntityId === relatedId,
        );
        const relatedEntityName =
          relInfo?.sourceEntityId === relatedId
            ? relInfo.sourceEntity.name
            : relInfo?.targetEntity.name;

        return {
          relatedEntityId: relatedId,
          relatedEntityName,
          sharedMemberCount: sharedMembers.length,
          sharedMembers: sharedMembers.map((m) => ({
            personId: m.personId,
            name: m.person.name,
          })),
        };
      }),
    );

    return {
      entityId,
      totalRelated: relatedEntityIds.length,
      overlaps: overlaps.filter((o) => o.sharedMemberCount > 0),
    };
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

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  private async isMember(entityId: string, personId: string): Promise<boolean> {
    return !!(await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    }));
  }

  private async isAdminOrFounder(entityId: string, personId: string) {
    return !!(await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    }));
  }
}
