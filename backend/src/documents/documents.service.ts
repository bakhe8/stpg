import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  MemberRole,
  Prisma,
  SubjectType,
  SubscriptionState,
  TransparencyLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

type DocumentWithContext = Prisma.DocumentGetPayload<{
  include: {
    uploadedBy: { select: { id: true; name: true } };
    wallet: { select: { id: true; name: true } };
    governancePath: { select: { id: true; name: true } };
    decision: { select: { id: true; title: true } };
    disbursementRequest: {
      select: { id: true; beneficiaryName: true; status: true };
    };
    appeal: {
      select: {
        id: true;
        type: true;
        status: true;
        appealedById: true;
        reviewerId: true;
      };
    };
    dispute: {
      select: {
        id: true;
        title: true;
        status: true;
        initiatorId: true;
        respondentId: true;
        arbitratorId: true;
      };
    };
  };
}>;

interface ResolvedDocumentContext {
  entityId: string | null;
  walletId: string | null;
  governancePathId: string | null;
  decisionId: string | null;
  disbursementRequestId: string | null;
  appealId: string | null;
  disputeId: string | null;
}

interface DocumentVisibilityContext {
  subscribedPathIds: Set<string>;
  subscribedWalletIds: Set<string>;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(uploaderId: string, dto: CreateDocumentDto) {
    const context = await this.resolveDocumentContext(dto);

    if (context.entityId) {
      await this.requireMember(context.entityId, uploaderId);
    }

    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          uploadedById: uploaderId,
          name: dto.name,
          fileUrl: dto.fileUrl,
          fileType: dto.fileType,
          fileSize: dto.fileSize,
          entityId: context.entityId,
          walletId: context.walletId,
          governancePathId: context.governancePathId,
          decisionId: context.decisionId,
          disbursementRequestId: context.disbursementRequestId,
          appealId: context.appealId,
          disputeId: context.disputeId,
          privacyLevel:
            dto.privacyLevel ?? TransparencyLevel.VISIBLE_TO_COMMITTEE,
        },
        include: this.documentInclude,
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: uploaderId,
          entityId: context.entityId,
          targetType: 'documents',
          targetId: document.id,
          newValue: {
            name: document.name,
            fileType: document.fileType,
            privacyLevel: document.privacyLevel,
            walletId: document.walletId,
            governancePathId: document.governancePathId,
            decisionId: document.decisionId,
            disbursementRequestId: document.disbursementRequestId,
            appealId: document.appealId,
            disputeId: document.disputeId,
          },
        },
      });

      return document;
    });
  }

  async findEntityDocuments(entityId: string, requesterId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { entityId, personId: requesterId, isActive: true },
    });
    if (!membership) {
      throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
    }

    const visibilityContext = await this.buildVisibilityContext(
      entityId,
      requesterId,
    );
    const documents = await this.prisma.document.findMany({
      where: { entityId },
      include: this.documentInclude,
      orderBy: { createdAt: 'desc' },
    });

    return documents.filter((document) =>
      this.canViewDocument(
        document,
        requesterId,
        membership.role,
        visibilityContext,
      ),
    );
  }

  async findById(id: string, requesterId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: this.documentInclude,
    });
    if (!document) {
      throw new NotFoundException('المستند غير موجود');
    }

    if (document.uploadedById === requesterId) {
      return document;
    }

    if (!document.entityId) {
      throw new ForbiddenException('ليس لديك صلاحية رؤية هذا المستند');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId: document.entityId,
        personId: requesterId,
        isActive: true,
      },
    });
    if (!membership) {
      throw new ForbiddenException('ليس لديك صلاحية رؤية هذا المستند');
    }

    const visibilityContext = await this.buildVisibilityContext(
      document.entityId,
      requesterId,
    );
    if (
      !this.canViewDocument(
        document,
        requesterId,
        membership.role,
        visibilityContext,
      )
    ) {
      throw new ForbiddenException(
        'مستوى الخصوصية أو سياق المستند لا يسمح لك بالوصول',
      );
    }

    return document;
  }

  async findMyDocuments(personId: string) {
    return this.prisma.document.findMany({
      where: { uploadedById: personId },
      include: this.documentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(id: string, requesterId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('المستند غير موجود');

    const isOwner = doc.uploadedById === requesterId;
    const isAdmin = doc.entityId
      ? await this.isAdminOrFounder(doc.entityId, requesterId)
      : false;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('فقط صاحب المستند أو المدير يمكنه الحذف');
    }

    await this.prisma.$transaction([
      this.prisma.document.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.DELETE,
          personId: requesterId,
          entityId: doc.entityId,
          targetType: 'documents',
          targetId: id,
          oldValue: {
            name: doc.name,
            fileType: doc.fileType,
            privacyLevel: doc.privacyLevel,
          },
        },
      }),
    ]);
    return { deleted: true };
  }

  private readonly documentInclude = {
    uploadedBy: { select: { id: true, name: true } },
    wallet: { select: { id: true, name: true } },
    governancePath: { select: { id: true, name: true } },
    decision: { select: { id: true, title: true } },
    disbursementRequest: {
      select: { id: true, beneficiaryName: true, status: true },
    },
    appeal: {
      select: {
        id: true,
        type: true,
        status: true,
        appealedById: true,
        reviewerId: true,
      },
    },
    dispute: {
      select: {
        id: true,
        title: true,
        status: true,
        initiatorId: true,
        respondentId: true,
        arbitratorId: true,
      },
    },
  } satisfies Prisma.DocumentInclude;

  private canViewDocument(
    document: DocumentWithContext,
    requesterId: string,
    role: MemberRole,
    visibilityContext: DocumentVisibilityContext,
  ): boolean {
    switch (document.privacyLevel) {
      case TransparencyLevel.PUBLIC_TO_MEMBERS:
      case TransparencyLevel.AGGREGATED_ONLY:
        return true;
      case TransparencyLevel.VISIBLE_TO_PARTICIPANTS:
        return (
          this.isCommitteeOrHigher(role) ||
          this.isParticipantContextVisible(document, visibilityContext)
        );
      case TransparencyLevel.VISIBLE_TO_COMMITTEE:
        return this.isCommitteeOrHigher(role);
      case TransparencyLevel.VISIBLE_TO_AUDITOR:
        return this.isAuditorOrHigher(role);
      case TransparencyLevel.HIDDEN_SENSITIVE:
        return (
          this.isAuditorOrHigher(role) ||
          this.isCaseActor(document, requesterId) ||
          document.uploadedById === requesterId
        );
      default:
        return false;
    }
  }

  private isParticipantContextVisible(
    document: DocumentWithContext,
    visibilityContext: DocumentVisibilityContext,
  ): boolean {
    if (document.governancePathId) {
      return visibilityContext.subscribedPathIds.has(document.governancePathId);
    }

    if (document.walletId) {
      return visibilityContext.subscribedWalletIds.has(document.walletId);
    }

    return true;
  }

  private isCaseActor(
    document: DocumentWithContext,
    requesterId: string,
  ): boolean {
    if (
      document.appeal &&
      [document.appeal.appealedById, document.appeal.reviewerId].includes(
        requesterId,
      )
    ) {
      return true;
    }

    if (
      document.dispute &&
      [
        document.dispute.initiatorId,
        document.dispute.respondentId,
        document.dispute.arbitratorId,
      ].includes(requesterId)
    ) {
      return true;
    }

    return false;
  }

  private isCommitteeOrHigher(role: MemberRole): boolean {
    const roles: MemberRole[] = [
      MemberRole.COMMITTEE_MEMBER,
      MemberRole.TREASURER,
      MemberRole.AUDITOR,
      MemberRole.ADMIN,
      MemberRole.FOUNDER,
    ];
    return roles.includes(role);
  }

  private isAuditorOrHigher(role: MemberRole): boolean {
    const roles: MemberRole[] = [
      MemberRole.AUDITOR,
      MemberRole.ADMIN,
      MemberRole.FOUNDER,
    ];
    return roles.includes(role);
  }

  private async buildVisibilityContext(
    entityId: string,
    personId: string,
  ): Promise<DocumentVisibilityContext> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        state: SubscriptionState.ACTIVE,
        membership: {
          entityId,
          personId,
          isActive: true,
        },
      },
      select: {
        governancePathId: true,
        governancePath: { select: { walletId: true } },
      },
    });

    return {
      subscribedPathIds: new Set(
        subscriptions.map((subscription) => subscription.governancePathId),
      ),
      subscribedWalletIds: new Set(
        subscriptions.map(
          (subscription) => subscription.governancePath.walletId,
        ),
      ),
    };
  }

  private async resolveDocumentContext(
    dto: CreateDocumentDto,
  ): Promise<ResolvedDocumentContext> {
    let entityId = dto.entityId ?? null;
    let walletId = dto.walletId ?? null;
    let governancePathId = dto.governancePathId ?? null;
    let decisionId = dto.decisionId ?? null;
    const disbursementRequestId = dto.disbursementRequestId ?? null;
    const appealId = dto.appealId ?? null;
    const disputeId = dto.disputeId ?? null;

    if (walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
        select: { entityId: true },
      });
      if (!wallet) {
        throw new NotFoundException('المحفظة غير موجودة');
      }
      entityId = this.ensureSameUuid(
        entityId,
        wallet.entityId,
        'المحفظة لا تنتمي إلى الكيان المحدد',
      );
    }

    if (governancePathId) {
      const path = await this.prisma.governancePath.findUnique({
        where: { id: governancePathId },
        select: { walletId: true, wallet: { select: { entityId: true } } },
      });
      if (!path) {
        throw new NotFoundException('مسار الحوكمة غير موجود');
      }
      walletId = this.ensureSameUuid(
        walletId,
        path.walletId,
        'مسار الحوكمة لا ينتمي إلى المحفظة المحددة',
      );
      entityId = this.ensureSameUuid(
        entityId,
        path.wallet.entityId,
        'مسار الحوكمة لا ينتمي إلى الكيان المحدد',
      );
    }

    if (decisionId) {
      const decisionContext = await this.resolveDecisionContext(decisionId);
      governancePathId = this.ensureSameUuid(
        governancePathId,
        decisionContext.governancePathId,
        'القرار لا ينتمي إلى مسار الحوكمة المحدد',
      );
      entityId = this.ensureSameUuid(
        entityId,
        decisionContext.entityId,
        'القرار لا ينتمي إلى الكيان المحدد',
      );
    }

    if (disbursementRequestId) {
      const request = await this.prisma.disbursementRequest.findUnique({
        where: { id: disbursementRequestId },
        select: {
          decisionId: true,
          governancePathId: true,
          governancePath: {
            select: {
              walletId: true,
              wallet: { select: { entityId: true } },
            },
          },
        },
      });
      if (!request) {
        throw new NotFoundException('طلب الصرف غير موجود');
      }
      governancePathId = this.ensureSameUuid(
        governancePathId,
        request.governancePathId,
        'طلب الصرف لا ينتمي إلى مسار الحوكمة المحدد',
      );
      walletId = this.ensureSameUuid(
        walletId,
        request.governancePath.walletId,
        'طلب الصرف لا ينتمي إلى المحفظة المحددة',
      );
      entityId = this.ensureSameUuid(
        entityId,
        request.governancePath.wallet.entityId,
        'طلب الصرف لا ينتمي إلى الكيان المحدد',
      );
      decisionId = this.ensureSameUuid(
        decisionId,
        request.decisionId,
        'طلب الصرف مرتبط بقرار مختلف',
      );
    }

    if (appealId) {
      const appeal = await this.prisma.appeal.findUnique({
        where: { id: appealId },
        select: { decisionId: true },
      });
      if (!appeal) {
        throw new NotFoundException('الاعتراض غير موجود');
      }
      decisionId = this.ensureSameUuid(
        decisionId,
        appeal.decisionId,
        'الاعتراض مرتبط بقرار مختلف',
      );
      const appealDecisionContext = await this.resolveDecisionContext(
        appeal.decisionId,
      );
      governancePathId = this.ensureSameUuid(
        governancePathId,
        appealDecisionContext.governancePathId,
        'الاعتراض لا ينتمي إلى مسار الحوكمة المحدد',
      );
      entityId = this.ensureSameUuid(
        entityId,
        appealDecisionContext.entityId,
        'الاعتراض لا ينتمي إلى الكيان المحدد',
      );
    }

    if (disputeId) {
      const dispute = await this.prisma.dispute.findUnique({
        where: { id: disputeId },
        select: {
          entityId: true,
          walletId: true,
          governancePathId: true,
        },
      });
      if (!dispute) {
        throw new NotFoundException('النزاع غير موجود');
      }
      entityId = this.ensureSameUuid(
        entityId,
        dispute.entityId,
        'النزاع لا ينتمي إلى الكيان المحدد',
      );
      walletId = this.ensureSameUuid(
        walletId,
        dispute.walletId,
        'النزاع لا ينتمي إلى المحفظة المحددة',
      );
      governancePathId = this.ensureSameUuid(
        governancePathId,
        dispute.governancePathId,
        'النزاع لا ينتمي إلى مسار الحوكمة المحدد',
      );
    }

    return {
      entityId,
      walletId,
      governancePathId,
      decisionId,
      disbursementRequestId,
      appealId,
      disputeId,
    };
  }

  private ensureSameUuid(
    currentValue: string | null,
    incomingValue: string | null | undefined,
    conflictMessage: string,
  ) {
    if (!incomingValue) {
      return currentValue;
    }

    if (currentValue && currentValue !== incomingValue) {
      throw new BadRequestException(conflictMessage);
    }

    return currentValue ?? incomingValue;
  }

  private async resolveDecisionContext(decisionId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      select: {
        subjectType: true,
        subjectId: true,
        governancePathId: true,
        governancePath: {
          select: {
            wallet: { select: { entityId: true } },
          },
        },
      },
    });
    if (!decision) {
      throw new NotFoundException('القرار غير موجود');
    }

    const entityId =
      decision.governancePath?.wallet.entityId ??
      (await this.resolveSubjectEntityId(
        decision.subjectType,
        decision.subjectId,
      ));

    return {
      entityId,
      governancePathId: decision.governancePathId,
    };
  }

  private async resolveSubjectEntityId(
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<string> {
    switch (subjectType) {
      case SubjectType.ENTITY:
        return subjectId;
      case SubjectType.WALLET: {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: subjectId },
          select: { entityId: true },
        });
        if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
        return wallet.entityId;
      }
      case SubjectType.PATH: {
        const path = await this.prisma.governancePath.findUnique({
          where: { id: subjectId },
          select: { wallet: { select: { entityId: true } } },
        });
        if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
        return path.wallet.entityId;
      }
      case SubjectType.SPENDING_ITEM: {
        const item = await this.prisma.spendingItem.findUnique({
          where: { id: subjectId },
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        });
        if (!item) throw new NotFoundException('بند الصرف غير موجود');
        return item.governancePath.wallet.entityId;
      }
      case SubjectType.MEMBERSHIP: {
        const membership = await this.prisma.membership.findUnique({
          where: { id: subjectId },
          select: { entityId: true },
        });
        if (!membership) throw new NotFoundException('العضوية غير موجودة');
        return membership.entityId;
      }
      default:
        throw new BadRequestException('نوع موضوع القرار غير مدعوم');
    }
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
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
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    }));
  }
}
