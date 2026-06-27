import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  LedgerAccountType,
  MemberRole,
  MembershipApplicationStatus,
  EntityType,
  GovernancePathType,
} from '@prisma/client';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { UpdateEntityPolicyDto } from './dto/update-entity-policy.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  CreateSubEntityDto,
  CreateCampaignDto,
  validateCampaignEndsAt,
} from './dto/create-sub-entity.dto';
import { toJsonValue } from '../prisma/json-value';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../core/tenant-context/tenant-context.service';

@Injectable()
export class EntitiesService {
  private readonly membershipRolePriority: Record<MemberRole, number> = {
    [MemberRole.FOUNDER]: 0,
    [MemberRole.ADMIN]: 1,
    [MemberRole.TREASURER]: 2,
    [MemberRole.AUDITOR]: 3,
    [MemberRole.COMMITTEE_MEMBER]: 4,
    [MemberRole.MEMBER]: 5,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createEntity(creatorId: string, dto: CreateEntityDto) {
    const creator = await this.prisma.person.findUnique({
      where: { id: creatorId },
    });
    if (!creator?.isVerified) {
      throw new ForbiddenException('يجب تفعيل حسابك أولاً قبل إنشاء كيان');
    }

    let template = null;
    if (dto.templateId) {
      template = await this.prisma.entityTemplate.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new Error('Template not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          name: dto.name,
          type: dto.type,
          description: dto.description,
          logoUrl: dto.logoUrl,
          policy: {
            create: template?.defaultPolicy
              ? (template.defaultPolicy as Record<string, unknown>)
              : {},
          },
          ledgerAccount: { create: { type: LedgerAccountType.ENTITY } },
          memberships: {
            create: { personId: creatorId, role: MemberRole.FOUNDER },
          },
        },
        include: { policy: true },
      });

      // Create default wallets from template
      const createdWallets = [];
      if (template?.defaultWallets) {
        const wallets = template.defaultWallets as {
          name: string;
          type?: string;
          id?: string;
        }[];
        for (const w of wallets) {
          const wallet = await tx.wallet.create({
            data: {
              name: String(w.name),
              entityId: entity.id,
              description: w.type === 'RESERVE' ? 'احتياطية' : 'أساسية',
              ledgerAccount: { create: { type: LedgerAccountType.WALLET } },
            },
          });
          createdWallets.push({ ...wallet, tempId: w.id }); // keep tempId for path binding
        }
      }

      // Create default paths from template
      if (template?.defaultPaths && createdWallets.length > 0) {
        const paths = template.defaultPaths as {
          name: string;
          walletTempId?: string;
          type?: GovernancePathType;
          rules?: unknown[];
        }[];
        for (const p of paths) {
          // If the path binds to a specific wallet by tempId
          const boundWallet = p.walletTempId
            ? createdWallets.find((cw) => cw.tempId === p.walletTempId)
            : createdWallets[0];
          await tx.governancePath.create({
            data: {
              name: String(p.name),
              type: p.type || 'BOARD',
              walletId: boundWallet ? boundWallet.id : createdWallets[0].id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: creatorId,
          entityId: entity.id,
          targetType: 'entities',
          targetId: entity.id,
          newValue: { name: entity.name, type: entity.type },
        },
      });

      return entity;
    });
  }

  async findById(id: string, requesterId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        policy: true,
        memberships: {
          where: { personId: requesterId, isActive: true },
          select: { id: true, role: true },
          take: 1,
        },
        _count: { select: { memberships: { where: { isActive: true } } } },
      },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');
    await this.requireMember(id, requesterId);
    const { memberships, ...visibleEntity } = entity;
    return {
      ...visibleEntity,
      myMembershipId: memberships[0]?.id ?? null,
      myRole: memberships[0]?.role ?? null,
    };
  }

  async findMyEntities(personId: string) {
    const entities = await this.prisma.entity.findMany({
      where: {
        memberships: { some: { personId, isActive: true } },
      },
      include: {
        memberships: {
          where: { personId, isActive: true },
          select: { id: true, role: true, joinedAt: true },
          take: 1,
        },
        _count: { select: { memberships: { where: { isActive: true } } } },
      },
    });

    const sortedEntities = entities.sort((left, right) => {
      const leftMembership = left.memberships[0];
      const rightMembership = right.memberships[0];
      const leftPriority =
        this.membershipRolePriority[
          leftMembership?.role ?? MemberRole.MEMBER
        ] ?? Number.MAX_SAFE_INTEGER;
      const rightPriority =
        this.membershipRolePriority[
          rightMembership?.role ?? MemberRole.MEMBER
        ] ?? Number.MAX_SAFE_INTEGER;

      return (
        leftPriority - rightPriority ||
        (leftMembership?.joinedAt?.getTime() ?? 0) -
          (rightMembership?.joinedAt?.getTime() ?? 0) ||
        left.foundedAt.getTime() - right.foundedAt.getTime() ||
        left.name.localeCompare(right.name, 'ar')
      );
    });

    return sortedEntities.map(({ memberships, ...entity }) => ({
      ...entity,
      myMembershipId: memberships[0]?.id ?? null,
      myRole: memberships[0]?.role ?? null,
    }));
  }

  async updateEntity(id: string, adminId: string, dto: UpdateEntityDto) {
    await this.requireAdminOrFounder(id, adminId);

    const entity = await this.prisma.entity.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: id,
        targetType: 'entities',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return entity;
  }

  async getPolicy(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const policy = await this.prisma.entityPolicy.findUnique({
      where: { entityId },
      include: {
        policyVersions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!policy) throw new NotFoundException('سياسة الكيان غير موجودة');
    return policy;
  }

  async updatePolicy(
    entityId: string,
    adminId: string,
    dto: UpdateEntityPolicyDto,
  ) {
    await this.requireAdminOrFounder(entityId, adminId);

    const policy = await this.prisma.entityPolicy.findUnique({
      where: { entityId },
    });
    if (!policy) throw new NotFoundException('سياسة الكيان غير موجودة');

    return this.prisma.$transaction(async (tx) => {
      await tx.policyVersion.create({
        data: {
          entityPolicyId: policy.id,
          version: policy.version,
          snapshot: toJsonValue(policy),
          changedById: adminId,
        },
      });

      const updated = await tx.entityPolicy.update({
        where: { entityId },
        data: { ...dto, version: { increment: 1 } },
      });

      // إرسال إشعارات لتغيير سياسة الكيان
      const members = await tx.membership.findMany({
        where: { entityId, isActive: true },
        select: { personId: true },
      });
      if (members.length > 0) {
        await this.notifications.createBulk(
          members.map((m) => ({
            personId: m.personId,
            type: 'POLICY_CHANGED',
            title: 'تحديث في سياسة الكيان',
            body: 'تم تعديل سياسات الكيان، ولديك حق الاعتراض خلال فترة السماح.',
          })),
        );
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId,
          targetType: 'entity_policies',
          targetId: policy.id,
          oldValue: toJsonValue(policy),
          newValue: toJsonValue(dto),
        },
      });

      // نشر القيم الافتراضية للحوكمة للفروع المباشرة التي لم تُخصص بعد
      const inheritableFields = [
        'defaultVoteType',
        'decisionQuorumPercent',
        'defaultTransparency',
        'allowAppeals',
        'appealTimeoutDays',
      ] as const;

      const children = await tx.entity.findMany({
        where: { parentEntityId: entityId, isActive: true },
        select: { id: true },
      });

      for (const child of children) {
        const childPolicy = await tx.entityPolicy.findUnique({
          where: { entityId: child.id },
        });
        if (!childPolicy) continue;

        const propagated: Record<string, unknown> = {};
        for (const field of inheritableFields) {
          if (dto[field] === undefined) continue;
          // propagate only if child value still matches old parent value (not customized)
          if (String(childPolicy[field]) === String(policy[field])) {
            propagated[field] = dto[field];
          }
        }

        if (Object.keys(propagated).length > 0) {
          await tx.entityPolicy.update({
            where: { entityId: child.id },
            data: propagated,
          });
        }
      }

      return updated;
    });
  }

  async getMembers(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);
    const canManage = await this.isAdminOrFounder(entityId, requesterId);

    return this.prisma.membership.findMany({
      where: { entityId, ...(canManage ? {} : { isActive: true }) },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async getDisputeRespondentOptions(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const memberships = await this.prisma.membership.findMany({
      where: {
        entityId,
        isActive: true,
        personId: { not: requesterId },
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

    return memberships.map(({ person }) => person);
  }

  async inviteMember(entityId: string, adminId: string, dto: InviteMemberDto) {
    await this.requireAdminOrFounder(entityId, adminId);

    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);

    // إيجاد أو إنشاء الشخص بالجوال
    let person = await this.prisma.person.findFirst({
      where: { phoneNumber },
    });

    if (!person) {
      person = await this.prisma.person.create({
        data: {
          username: phoneNumber,
          name: dto.name ?? phoneNumber,
          phoneNumber,
          isVerified: false,
        },
      });
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        personId_entityId: { entityId, personId: person.id },
      },
    });
    if (existing?.isActive) {
      throw new ConflictException('الشخص عضو بالفعل في هذا الكيان');
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.membershipApplication.upsert({
        where: {
          personId_entityId: { entityId, personId: person.id },
        },
        update: {
          status: MembershipApplicationStatus.PENDING,
          requestedRole: dto.role ?? MemberRole.MEMBER,
          sponsorName: adminId,
          note: 'دعوة مباشرة من إدارة الكيان',
          reviewedById: null,
          reviewerNotes: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
        create: {
          entityId,
          personId: person.id,
          requestedRole: dto.role ?? MemberRole.MEMBER,
          sponsorName: adminId,
          note: 'دعوة مباشرة من إدارة الكيان',
        },
        include: {
          person: {
            select: {
              id: true,
              name: true,
              username: true,
              phoneNumber: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: adminId,
          entityId,
          targetType: 'membership_applications',
          targetId: application.id,
          newValue: {
            personId: person.id,
            requestedRole: application.requestedRole,
            source: 'admin_invitation',
          },
        },
      });

      return application;
    });
  }

  async requestToJoin(entityId: string, personId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { policy: true },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');

    if (!entity.policy?.allowOpenMembership) {
      throw new ForbiddenException('هذا الكيان لا يسمح بالانضمام المفتوح');
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        personId_entityId: { entityId, personId },
      },
    });
    if (existing?.isActive) {
      throw new ConflictException('أنت عضو بالفعل في هذا الكيان');
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.membershipApplication.upsert({
        where: { personId_entityId: { entityId, personId } },
        update: {
          status: MembershipApplicationStatus.PENDING,
          requestedRole: MemberRole.MEMBER,
          reviewedById: null,
          reviewerNotes: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
        create: {
          entityId,
          personId,
          requestedRole: MemberRole.MEMBER,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId,
          entityId,
          targetType: 'membership_applications',
          targetId: application.id,
          newValue: {
            status: application.status,
            source: 'open_membership_request',
          },
        },
      });

      return application;
    });
  }

  // ==================================================================
  // SUB-ENTITIES
  // ==================================================================

  async createSubEntity(
    parentId: string,
    creatorId: string,
    dto: CreateSubEntityDto,
  ) {
    const parent = await this.prisma.entity.findUnique({
      where: { id: parentId },
      include: { policy: true },
    });
    if (!parent) throw new NotFoundException('الكيان الأب غير موجود');
    if (!parent.isActive) throw new ForbiddenException('الكيان الأب غير نشط');
    if (parent.isCampaign)
      throw new ForbiddenException('لا يمكن إنشاء كيان فرعي تحت حملة مؤقتة');
    if (parent.policy && !parent.policy.allowSubEntities) {
      throw new ForbiddenException('سياسة الكيان لا تسمح بإنشاء كيانات فرعية');
    }

    await this.requireAdminOrFounder(parentId, creatorId);

    return this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          name: dto.name,
          type: dto.type,
          description: dto.description,
          logoUrl: dto.logoUrl,
          parentEntityId: parentId,
          policy: { create: {} },
          ledgerAccount: { create: { type: LedgerAccountType.ENTITY } },
          memberships: {
            create: { personId: creatorId, role: MemberRole.FOUNDER },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: creatorId,
          entityId: entity.id,
          targetType: 'entities',
          targetId: entity.id,
          newValue: { name: entity.name, parentEntityId: parentId },
        },
      });

      return entity;
    });
  }

  async listSubEntities(parentId: string, requesterId: string) {
    const parent = await this.prisma.entity.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('الكيان الأب غير موجود');
    await this.requireMember(parentId, requesterId);

    return this.prisma.entity.findMany({
      where: { parentEntityId: parentId, isActive: true },
      include: {
        _count: {
          select: {
            memberships: { where: { isActive: true } },
            subEntities: true,
          },
        },
      },
      orderBy: { foundedAt: 'asc' },
    });
  }

  async getHierarchy(entityId: string, requesterId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        parentEntity: { select: { id: true, name: true, type: true } },
        subEntities: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                memberships: { where: { isActive: true } },
                subEntities: true,
              },
            },
            subEntities: {
              where: { isActive: true },
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');
    await this.requireMember(entityId, requesterId);
    return entity;
  }

  async getSubEntitiesFinancialReport(entityId: string, requesterId: string) {
    const exists = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('الكيان غير موجود');
    await this.requireMember(entityId, requesterId);

    const subEntities = await this.prisma.entity.findMany({
      where: { parentEntityId: entityId, isActive: true },
      include: {
        wallets: {
          where: { isActive: true },
          include: { ledgerAccount: { select: { balance: true } } },
        },
      },
    });

    const report = subEntities.map((sub) => {
      const totalBalance = sub.wallets.reduce(
        (sum, w) => sum + Number(w.ledgerAccount?.balance || 0),
        0,
      );
      return {
        id: sub.id,
        name: sub.name,
        type: sub.type,
        walletsCount: sub.wallets.length,
        totalBalance,
      };
    });

    const grandTotal = report.reduce((sum, item) => sum + item.totalBalance, 0);

    return {
      parentEntityId: entityId,
      subEntities: report,
      grandTotalBalance: grandTotal,
    };
  }

  // ==================================================================
  // CAMPAIGNS
  // ==================================================================

  async createCampaign(
    parentId: string,
    creatorId: string,
    dto: CreateCampaignDto,
  ) {
    const parent = await this.prisma.entity.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('الكيان الأب غير موجود');
    if (!parent.isActive) throw new ForbiddenException('الكيان الأب غير نشط');

    validateCampaignEndsAt(dto.campaignEndsAt);

    await this.requireAdminOrFounder(parentId, creatorId);

    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.entity.create({
        data: {
          name: dto.name,
          type: EntityType.CAMPAIGN,
          description: dto.description,
          parentEntityId: parentId,
          isCampaign: true,
          campaignEndsAt: dto.campaignEndsAt
            ? new Date(dto.campaignEndsAt)
            : null,
          policy: { create: {} },
          ledgerAccount: { create: { type: LedgerAccountType.ENTITY } },
          memberships: {
            create: { personId: creatorId, role: MemberRole.FOUNDER },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: creatorId,
          entityId: campaign.id,
          targetType: 'entities',
          targetId: campaign.id,
          newValue: {
            name: campaign.name,
            isCampaign: true,
            parentEntityId: parentId,
          },
        },
      });

      return campaign;
    });
  }

  async archiveCampaign(parentId: string, campaignId: string, adminId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: campaignId },
    });
    if (!entity) throw new NotFoundException('الحملة غير موجودة');
    if (!entity.isCampaign) throw new ForbiddenException('هذا الكيان ليس حملة');
    if (entity.parentEntityId !== parentId) {
      throw new ForbiddenException('الحملة لا تنتمي لهذا الكيان');
    }

    // التحقق من صلاحية على الكيان الأب، لا على الحملة نفسها
    await this.requireAdminOrFounder(parentId, adminId);

    const updated = await this.prisma.entity.update({
      where: { id: campaignId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId: parentId,
        targetType: 'entities',
        targetId: campaignId,
        newValue: { isActive: false, archived: true },
      },
    });

    return updated;
  }

  async listCampaigns(parentId: string, requesterId: string) {
    const parent = await this.prisma.entity.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('الكيان غير موجود');
    await this.requireMember(parentId, requesterId);

    return this.prisma.entity.findMany({
      where: { parentEntityId: parentId, isCampaign: true },
      include: {
        _count: { select: { memberships: { where: { isActive: true } } } },
      },
      orderBy: { foundedAt: 'desc' },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async archiveExpiredCampaigns() {
    return this.tenantContext.runInternal(() =>
      this.archiveExpiredCampaignsInternal(),
    );
  }

  private async archiveExpiredCampaignsInternal() {
    const now = new Date();
    const expired = await this.prisma.entity.findMany({
      where: { isCampaign: true, isActive: true, campaignEndsAt: { lte: now } },
      select: { id: true, name: true, parentEntityId: true },
    });

    for (const campaign of expired) {
      const systemPersonId = await this.getSystemPersonId();
      await this.prisma.$transaction(async (tx) => {
        await tx.entity.update({
          where: { id: campaign.id },
          data: { isActive: false },
        });
        await tx.auditLog.create({
          data: {
            action: AuditAction.UPDATE,
            personId: systemPersonId,
            entityId: campaign.parentEntityId ?? campaign.id,
            targetType: 'entities',
            targetId: campaign.id,
            newValue: {
              isActive: false,
              archivedReason: 'campaignEndsAt_expired',
              archivedAt: now.toISOString(),
            },
          },
        });
      });

      if (campaign.parentEntityId) {
        const members = await this.prisma.membership.findMany({
          where: { entityId: campaign.parentEntityId, isActive: true },
          select: { personId: true },
        });
        if (members.length > 0) {
          await this.notifications.createBulk(
            members.map((m) => ({
              personId: m.personId,
              type: 'CAMPAIGN_EXPIRED' as const,
              title: 'انتهت مدة الحملة',
              body: `الحملة "${campaign.name}" أُغلقت تلقائياً لانتهاء مدتها`,
            })),
          );
        }
      }
    }

    if (expired.length > 0) {
      console.log(
        `[CampaignArchival] Archived ${expired.length} expired campaigns`,
      );
    }
  }

  private async getSystemPersonId(): Promise<string> {
    let system = await this.prisma.person.findFirst({
      where: { username: 'system' },
      select: { id: true },
    });
    if (!system) {
      system = await this.prisma.person.create({
        data: { username: 'system', name: 'النظام', isVerified: true },
        select: { id: true },
      });
    }
    return system.id;
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!membership)
      throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً للكيان');
  }

  private async isAdminOrFounder(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
      select: { id: true },
    });
    return !!membership;
  }

  private async requireMember(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!membership)
      throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }

  async exportEntityData(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const [entity, members, wallets, decisions, disputes] = await Promise.all([
      this.prisma.entity.findUnique({
        where: { id: entityId },
        include: { policy: true },
      }),
      this.prisma.membership.findMany({
        where: { entityId, isActive: true },
        include: { person: { select: { name: true, username: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.wallet.findMany({
        where: { entityId },
        include: { ledgerAccount: { select: { balance: true } } },
      }),
      this.prisma.decision.findMany({
        where: { governancePath: { wallet: { entityId } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.dispute.findMany({
        where: { entityId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      entity: {
        id: entity?.id,
        name: entity?.name,
        type: entity?.type,
        foundedAt: entity?.foundedAt,
        platformStatus: entity?.platformStatus,
      },
      members: members.map((m) => ({
        name: m.person.name,
        username: m.person.username,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      wallets: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        balance: w.ledgerAccount?.balance,
      })),
      decisions: decisions.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        createdAt: d.createdAt,
      })),
      disputes: disputes.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        type: d.type,
        createdAt: d.createdAt,
      })),
    };
  }

  async submitSuspensionAppeal(
    entityId: string,
    requesterId: string,
    reason: string,
  ) {
    await this.requireAdminOrFounder(entityId, requesterId);

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { platformStatus: true, name: true },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');
    if (entity.platformStatus === 'ACTIVE') {
      throw new ForbiddenException('لا يمكن تقديم اعتراض — الكيان نشط');
    }

    const existing = await this.prisma.platformSuspensionAppeal.findFirst({
      where: { entityId, status: 'PENDING' },
    });
    if (existing) {
      throw new ForbiddenException('يوجد اعتراض معلّق بانتظار المراجعة');
    }

    return this.prisma.platformSuspensionAppeal.create({
      data: { entityId, submittedById: requesterId, reason },
    });
  }

  async getEntitySuspensionAppeals(entityId: string, requesterId: string) {
    await this.requireAdminOrFounder(entityId, requesterId);
    return this.prisma.platformSuspensionAppeal.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPolicyImpact(
    entityId: string,
    requesterId: string,
    field: string,
    value: string,
  ) {
    await this.requireAdminOrFounder(entityId, requesterId);

    const [activeMembers, activeSubscriptions, pendingAppeals, openDecisions] =
      await Promise.all([
        this.prisma.membership.count({ where: { entityId, isActive: true } }),
        this.prisma.subscription.count({
          where: {
            membership: { entityId },
            state: { in: ['ACTIVE', 'CONDITIONAL'] },
          },
        }),
        this.prisma.appeal.count({
          where: {
            decision: { governancePath: { wallet: { entityId } } },
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
          },
        }),
        this.prisma.decision.count({
          where: {
            governancePath: { wallet: { entityId } },
            status: 'OPEN',
          },
        }),
      ]);

    const affectedGroups: string[] = [];

    if (['allowOpenMembership', 'requiresMemberApproval'].includes(field)) {
      affectedGroups.push(`${activeMembers} عضو نشط`);
    }
    if (['defaultVoteType', 'decisionQuorumPercent'].includes(field)) {
      if (openDecisions > 0)
        affectedGroups.push(
          `${openDecisions} قرار مفتوح (سيتأثر بالقواعد الجديدة فور تطبيقها)`,
        );
      affectedGroups.push(`${activeMembers} عضو (للقرارات القادمة)`);
    }
    if (['allowAppeals', 'appealTimeoutDays'].includes(field)) {
      if (pendingAppeals > 0)
        affectedGroups.push(`${pendingAppeals} اعتراض معلق`);
    }
    if (['defaultTransparency'].includes(field)) {
      affectedGroups.push(`${activeSubscriptions} اشتراك نشط`);
    }
    if (affectedGroups.length === 0) {
      affectedGroups.push(`${activeMembers} عضو نشط`);
    }

    return {
      field,
      value,
      activeMembers,
      activeSubscriptions,
      pendingAppeals,
      openDecisions,
      affected: affectedGroups,
      appliesAt: 'فوراً بعد الحفظ',
    };
  }

  async getClosureChecklist(entityId: string, requesterId: string) {
    await this.requireAdminOrFounder(entityId, requesterId);

    const [openDisbursements, openDisputes, wallets] = await Promise.all([
      this.prisma.disbursementRequest.count({
        where: {
          status: { in: ['PENDING', 'APPROVED'] },
          governancePath: { wallet: { entityId } },
        },
      }),
      this.prisma.dispute.count({
        where: {
          entityId,
          status: { in: ['OPEN', 'UNDER_MEDIATION', 'ESCALATED'] },
        },
      }),
      this.prisma.wallet.findMany({
        where: { entityId },
        include: { ledgerAccount: { select: { balance: true } } },
      }),
    ]);

    const totalBalance = wallets.reduce(
      (sum, w) => sum + Number(w.ledgerAccount?.balance ?? 0),
      0,
    );

    return {
      checks: [
        {
          key: 'no_open_disbursements',
          label: 'لا توجد طلبات صرف مفتوحة',
          passed: openDisbursements === 0,
          detail:
            openDisbursements > 0
              ? `${openDisbursements} طلب صرف قيد المراجعة`
              : null,
        },
        {
          key: 'no_open_disputes',
          label: 'لا توجد نزاعات مفتوحة',
          passed: openDisputes === 0,
          detail: openDisputes > 0 ? `${openDisputes} نزاع قيد المعالجة` : null,
        },
        {
          key: 'zero_balance',
          label: 'رصيد المحافظ صفر أو محوّل',
          passed: totalBalance <= 0,
          detail:
            totalBalance > 0
              ? `يوجد رصيد غير محوّل: ${totalBalance.toLocaleString('ar-SA')} ر.س`
              : null,
        },
      ],
      canClose:
        openDisbursements === 0 && openDisputes === 0 && totalBalance <= 0,
    };
  }

  async requestClosure(entityId: string, requesterId: string, reason: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId: requesterId,
        isActive: true,
        role: { in: ['FOUNDER', 'ADMIN'] },
      },
    });
    if (!membership)
      throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً للكيان');

    const checklist = await this.getClosureChecklist(entityId, requesterId);
    if (!checklist.canClose) {
      throw new BadRequestException(
        'لا يمكن طلب الإغلاق قبل استيفاء شروط القائمة',
      );
    }

    return this.prisma.entity.update({
      where: { id: entityId },
      data: {
        closureStatus: 'PENDING_CLOSURE',
        closureRequestedAt: new Date(),
        closureReason: reason,
      },
      select: {
        id: true,
        name: true,
        closureStatus: true,
        closureRequestedAt: true,
      },
    });
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.startsWith('05')
      ? `+966${phoneNumber.slice(1)}`
      : phoneNumber;
  }
}
