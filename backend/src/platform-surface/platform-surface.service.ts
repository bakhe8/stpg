import { Injectable } from '@nestjs/common';
import {
  EntityPlatformStatus,
  EntityType,
  PlatformAccessType,
  PlatformRole,
  SupportSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlatformSurfaceActionDto,
  PlatformSurfaceAccessEventDto,
  PlatformSurfaceAggregateInsightDto,
  PlatformSurfaceCapabilityDto,
  PlatformSurfaceEntityReviewDto,
  PlatformSurfaceMetricDto,
  PlatformSurfacePriority,
  PlatformSurfaceResponseDto,
  PlatformSurfaceSupportSessionDto,
  PlatformSurfaceTone,
} from './dto/platform-surface.dto';

type PlatformOperator = {
  id: string;
  email?: string;
  name?: string;
  role?: PlatformRole;
  isActive?: boolean;
};

const PLATFORM_STATUSES: readonly EntityPlatformStatus[] = [
  EntityPlatformStatus.ACTIVE,
  EntityPlatformStatus.PENDING_REVIEW,
  EntityPlatformStatus.SUSPENDED,
  EntityPlatformStatus.READ_ONLY,
];

@Injectable()
export class PlatformSurfaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOperator(
    operator: PlatformOperator,
  ): Promise<PlatformSurfaceResponseDto> {
    const now = new Date();
    const role = operator.role ?? PlatformRole.SUPPORT;
    const canManageEntities = this.canManageEntities(role);
    const isSupport = role === PlatformRole.SUPPORT;
    const isAnalyst = role === PlatformRole.ANALYST;

    const [
      statusCounts,
      totalEntities,
      activeSupportSessionCount,
      pendingAppealCount,
      breakGlassReviewCount,
      activeSupportSessions,
      entityReviews,
      pendingAppealActions,
      accessEvents,
    ] = await Promise.all([
      this.countEntitiesByStatus(),
      this.prisma.entity.count(),
      this.prisma.supportSession.count({
        where: {
          status: SupportSessionStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      }),
      this.prisma.platformSuspensionAppeal.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.platformAccessLog.count({
        where: {
          accessType: PlatformAccessType.BREAK_GLASS,
          reviewed: false,
        },
      }),
      this.findVisibleSupportSessions(operator.id, role, now),
      canManageEntities ? this.findEntityReviews() : Promise.resolve([]),
      canManageEntities ? this.findPendingAppealActions() : Promise.resolve([]),
      isAnalyst ? Promise.resolve([]) : this.findAccessEvents(operator.id, role),
    ]);

    const aggregateInsights = this.buildAggregateInsights({
      statusCounts,
      totalEntities,
      activeSupportSessionCount,
      pendingAppealCount,
      breakGlassReviewCount,
      isAnalyst,
    });
    const supportSessionItems = isAnalyst
      ? []
      : activeSupportSessions.map((session) =>
          this.presentSupportSession(session, operator.id, role),
        );
    const entityReviewItems = isAnalyst
      ? []
      : entityReviews.map((entity) => this.presentEntityReview(entity, role));
    const accessEventItems = accessEvents.map((event) =>
      this.presentAccessEvent(event),
    );
    const requiredActions = this.buildActions({
      role,
      supportSessions: supportSessionItems,
      entityReviews: entityReviewItems,
      pendingAppealActions,
      breakGlassReviewCount,
      aggregateInsights,
    });

    return {
      generatedAt: now.toISOString(),
      account: {
        id: operator.id,
        name: operator.name ?? 'مشغل المنصة',
        email: operator.email,
        role,
        roleLabel: this.platformRoleLabel(role),
        isActive: operator.isActive ?? true,
      },
      primaryMessage: this.buildPrimaryMessage(
        role,
        requiredActions,
        supportSessionItems,
        aggregateInsights,
      ),
      metrics: this.buildMetrics({
        role,
        statusCounts,
        totalEntities,
        activeSupportSessionCount,
        visibleSupportSessionCount: supportSessionItems.length,
        pendingAppealCount,
        breakGlassReviewCount,
      }),
      requiredActions,
      activeSupportSessions: supportSessionItems,
      entityReviews: entityReviewItems,
      accessEvents: accessEventItems,
      aggregateInsights,
      capabilities: this.buildCapabilities(role),
      advancedTools: this.buildAdvancedTools(role),
      diagnostics: {
        source: 'platform-surface-v1',
        legacyEntityTableAvailable: true,
      },
    };
  }

  private async countEntitiesByStatus() {
    const entries = await Promise.all(
      PLATFORM_STATUSES.map(async (status) => [
        status,
        await this.prisma.entity.count({ where: { platformStatus: status } }),
      ] as const),
    );
    return Object.fromEntries(entries) as Record<EntityPlatformStatus, number>;
  }

  private findVisibleSupportSessions(
    operatorId: string,
    role: PlatformRole,
    now: Date,
  ) {
    if (role === PlatformRole.ANALYST) {
      return Promise.resolve([]);
    }

    return this.prisma.supportSession.findMany({
      where: {
        status: SupportSessionStatus.ACTIVE,
        expiresAt: { gt: now },
        ...(role === PlatformRole.SUPPORT ? { platformAccountId: operatorId } : {}),
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            platformStatus: true,
          },
        },
        platformAccount: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: role === PlatformRole.SUPPORT ? 6 : 10,
    });
  }

  private findEntityReviews() {
    return this.prisma.entity.findMany({
      where: {
        platformStatus: {
          in: [
            EntityPlatformStatus.PENDING_REVIEW,
            EntityPlatformStatus.SUSPENDED,
            EntityPlatformStatus.READ_ONLY,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        platformStatus: true,
        suspendedReason: true,
        suspendedAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: [{ platformStatus: 'asc' }, { suspendedAt: 'desc' }],
      take: 10,
    });
  }

  private async findPendingAppealActions() {
    const appeals = await this.prisma.platformSuspensionAppeal.findMany({
      where: { status: 'PENDING' },
      include: {
        submittedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });
    const entityIds = [...new Set(appeals.map((appeal) => appeal.entityId))];
    const entities = entityIds.length
      ? await this.prisma.entity.findMany({
          where: { id: { in: entityIds } },
          select: { id: true, name: true, platformStatus: true },
        })
      : [];
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));

    return appeals.map((appeal) => {
      const entity = entityById.get(appeal.entityId);
      return {
        id: appeal.id,
        title: `اعتراض ينتظر رد المنصة: ${entity?.name ?? 'صندوق غير محدد'}`,
        body: `${appeal.submittedBy.name}: ${this.truncate(appeal.reason, 140)}`,
        scopeText: `الحالة الحالية: ${
          entity ? this.platformStatusLabel(entity.platformStatus) : 'غير محددة'
        }`,
        cta: { label: 'راجع الاعتراض', href: '/platform/appeals' },
      };
    });
  }

  private findAccessEvents(operatorId: string, role: PlatformRole) {
    return this.prisma.platformAccessLog.findMany({
      where:
        role === PlatformRole.SUPPORT
          ? { platformAccountId: operatorId }
          : {
              OR: [
                { accessType: PlatformAccessType.BREAK_GLASS, reviewed: false },
                { endedAt: null },
              ],
            },
      include: {
        platformAccount: {
          select: { name: true, role: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 8,
    });
  }

  private presentSupportSession(
    session: Awaited<ReturnType<PlatformSurfaceService['findVisibleSupportSessions']>>[number],
    operatorId: string,
    role: PlatformRole,
  ): PlatformSurfaceSupportSessionDto {
    const isOwnSession = session.platformAccountId === operatorId;
    const canOpenEntity =
      role !== PlatformRole.ANALYST && (role !== PlatformRole.SUPPORT || isOwnSession);

    return {
      id: session.id,
      entityId: canOpenEntity ? session.entityId : undefined,
      entityName: canOpenEntity ? session.entity.name : undefined,
      operatorName:
        role === PlatformRole.SUPPORT ? undefined : session.platformAccount.name,
      operatorRoleLabel:
        role === PlatformRole.SUPPORT
          ? undefined
          : this.platformRoleLabel(session.platformAccount.role),
      scope: session.scope,
      expiresAt: session.expiresAt.toISOString(),
      statusLabel: 'نشطة ومحددة بزمن',
      isOwnSession,
      whyShown: isOwnSession
        ? 'ظهرت لك لأنها جلسة دعم نشطة باسمك. لا تستخدم إلا النطاق المكتوب هنا.'
        : 'ظهرت لك لأن دورك يشرف على جلسات الدعم النشطة.',
      cta: canOpenEntity
        ? { label: 'افتح ضمن النطاق', href: `/entities/${session.entityId}` }
        : undefined,
    };
  }

  private presentEntityReview(
    entity: Awaited<ReturnType<PlatformSurfaceService['findEntityReviews']>>[number],
    role: PlatformRole,
  ): PlatformSurfaceEntityReviewDto {
    const canAct = this.canManageEntities(role);
    const statusLabel = this.platformStatusLabel(entity.platformStatus);
    const reason =
      entity.suspendedReason ??
      (entity.platformStatus === EntityPlatformStatus.PENDING_REVIEW
        ? 'ينتظر اكتمال مراجعة المنصة قبل اعتباره تشغيلياً بالكامل.'
        : 'لا يوجد سبب تفصيلي مسجل.');

    return {
      id: `entity-review-${entity.id}`,
      entityId: entity.id,
      entityName: entity.name,
      entityTypeLabel: this.entityTypeLabel(entity.type),
      status: entity.platformStatus,
      statusLabel,
      memberCount: entity._count.memberships,
      reason,
      title: `${entity.name}: ${statusLabel}`,
      body: this.entityReviewBody(entity.platformStatus),
      canAct,
      cta: canAct
        ? { label: 'راجع الحالة', href: `/platform?status=${entity.platformStatus}` }
        : undefined,
    };
  }

  private presentAccessEvent(
    event: Awaited<ReturnType<PlatformSurfaceService['findAccessEvents']>>[number],
  ): PlatformSurfaceAccessEventDto {
    return {
      id: event.id,
      title: `${this.platformRoleLabel(event.platformAccount.role)}: ${this.accessTypeLabel(
        event.accessType,
      )}`,
      body: event.endedAt
        ? 'جلسة وصول موثقة ومغلقة.'
        : 'جلسة وصول لا تزال مفتوحة وتحتاج إنهاء أو مراجعة.',
      accessTypeLabel: this.accessTypeLabel(event.accessType),
      entityName: event.entityId.slice(0, 8),
      operatorName: event.platformAccount.name,
      scope: event.dataScope,
      reason: event.reason,
      startedAt: event.startedAt.toISOString(),
      needsReview:
        event.accessType === PlatformAccessType.BREAK_GLASS && !event.reviewed,
    };
  }

  private buildActions(input: {
    role: PlatformRole;
    supportSessions: PlatformSurfaceSupportSessionDto[];
    entityReviews: PlatformSurfaceEntityReviewDto[];
    pendingAppealActions: Array<{
      id: string;
      title: string;
      body: string;
      scopeText: string;
      cta: { label: string; href: string };
    }>;
    breakGlassReviewCount: number;
    aggregateInsights: PlatformSurfaceAggregateInsightDto[];
  }): PlatformSurfaceActionDto[] {
    if (input.role === PlatformRole.ANALYST) {
      return [
        {
          id: 'analyst-aggregate-only',
          priority: 'info',
          title: 'اعمل على المؤشرات المجمعة فقط',
          body: 'هذا الحساب لا يرى أسماء صناديق أو أشخاص داخل سطح التشغيل اليومي.',
          scopeText: 'النطاق: جودة تشغيلية مجمعة بلا بيانات شخصية.',
          expectedAfterAction:
            'إذا احتجت حالة بعينها، اطلب من مشرف المنصة فتح مسار دعم مبرر.',
        },
      ];
    }

    if (input.role === PlatformRole.SUPPORT) {
      if (input.supportSessions.length === 0) {
        return [
          {
            id: 'support-no-active-sessions',
            priority: 'info',
            title: 'لا توجد جلسة دعم نشطة باسمك',
            body: 'لا تحتاج فتح الكيانات من الواجهة اليومية. انتظر جلسة محددة بزمن ونطاق واضح.',
            expectedAfterAction:
              'عند فتح جلسة دعم ستظهر هنا مع سببها ونطاقها ووقت انتهائها.',
          },
        ];
      }

      return input.supportSessions.map((session) => ({
        id: `support-session-action-${session.id}`,
        priority: 'normal' as PlatformSurfacePriority,
        title: `جلسة دعم نشطة: ${session.entityName ?? 'نطاق محدد'}`,
        body: 'استخدم هذه الجلسة لحل التذكرة المحددة فقط.',
        scopeText: session.scope,
        expectedAfterAction:
          'بعد انتهاء العمل أغلق التذكرة ولا توسّع النطاق من داخل الواجهة.',
        cta: session.cta,
      }));
    }

    const actions: PlatformSurfaceActionDto[] = [];
    for (const appeal of input.pendingAppealActions) {
      actions.push({
        id: `platform-appeal-${appeal.id}`,
        priority: 'urgent',
        title: appeal.title,
        body: appeal.body,
        scopeText: appeal.scopeText,
        expectedAfterAction:
          'بعد الرد يجب أن يعرف مدير الصندوق هل تمت المراجعة أم حُسم الاعتراض.',
        cta: appeal.cta,
      });
    }

    const pendingReviewCount = input.entityReviews.filter(
      (entity) => entity.status === EntityPlatformStatus.PENDING_REVIEW,
    ).length;
    if (pendingReviewCount > 0) {
      actions.push({
        id: 'platform-pending-review-entities',
        priority: 'normal',
        title: `${pendingReviewCount.toLocaleString('ar-SA')} صندوق قيد المراجعة`,
        body: 'لا تعاملها كصناديق تشغيلية كاملة حتى يكتمل سبب المراجعة.',
        scopeText: 'النطاق: حالة المنصة، وليس تفاصيل المال أو الأعضاء.',
        expectedAfterAction:
          'بعد المراجعة إمّا يعاد الصندوق إلى ACTIVE أو يظهر سبب واضح للمؤسس.',
        cta: { label: 'صفّ حالة المراجعة', href: '/platform?status=PENDING_REVIEW' },
      });
    }

    if (input.breakGlassReviewCount > 0) {
      actions.push({
        id: 'platform-break-glass-review',
        priority: 'critical',
        title: 'وصول طارئ يحتاج مراجعة',
        body: `${input.breakGlassReviewCount.toLocaleString(
          'ar-SA',
        )} حدث Break-glass غير مراجع بعد.`,
        scopeText: 'النطاق: مراجعة داخلية فقط، لا فتح بيانات جديدة.',
        expectedAfterAction:
          'يجب توثيق المراجعة حتى لا يبقى الوصول الطارئ خارج المتابعة.',
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'platform-no-required-actions',
        priority: 'info',
        title: 'لا يوجد تدخل منصة عاجل الآن',
        body: 'راقب المؤشرات والجلسات النشطة فقط. لا تفتح تفاصيل صندوق بلا سبب.',
        expectedAfterAction:
          'أي حالة جديدة ستظهر هنا كإجراء محدد بدل جدول عام طويل.',
      });
    }

    return actions.sort(
      (a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority),
    );
  }

  private buildAggregateInsights(input: {
    statusCounts: Record<EntityPlatformStatus, number>;
    totalEntities: number;
    activeSupportSessionCount: number;
    pendingAppealCount: number;
    breakGlassReviewCount: number;
    isAnalyst: boolean;
  }): PlatformSurfaceAggregateInsightDto[] {
    return [
      {
        id: 'aggregate-operational-health',
        title: 'الصحة التشغيلية العامة',
        body: input.isAnalyst
          ? 'مؤشر مجمع فقط: لا يعرض أسماء صناديق أو أعضاء.'
          : 'ملخص سريع قبل فتح الحالات التفصيلية.',
        value: input.statusCounts.ACTIVE,
        tone: 'positive',
      },
      {
        id: 'aggregate-review-load',
        title: 'عبء المراجعة',
        body: 'صناديق قيد المراجعة أو معلقة أو قراءة فقط.',
        value:
          input.statusCounts.PENDING_REVIEW +
          input.statusCounts.SUSPENDED +
          input.statusCounts.READ_ONLY,
        tone:
          input.statusCounts.SUSPENDED + input.breakGlassReviewCount > 0
            ? 'attention'
            : 'neutral',
      },
      {
        id: 'aggregate-support-load',
        title: 'ضغط الدعم',
        body: 'جلسات دعم نشطة يجب أن تبقى محددة بزمن ونطاق.',
        value: input.activeSupportSessionCount,
        tone: input.activeSupportSessionCount > 0 ? 'attention' : 'positive',
      },
      {
        id: 'aggregate-appeals',
        title: 'اعتراضات معلقة',
        body: 'طلبات تنتظر ردًا واضحًا من المنصة.',
        value: input.pendingAppealCount,
        tone: input.pendingAppealCount > 0 ? 'attention' : 'positive',
      },
    ];
  }

  private buildMetrics(input: {
    role: PlatformRole;
    statusCounts: Record<EntityPlatformStatus, number>;
    totalEntities: number;
    activeSupportSessionCount: number;
    visibleSupportSessionCount: number;
    pendingAppealCount: number;
    breakGlassReviewCount: number;
  }): PlatformSurfaceMetricDto[] {
    const supportCaption =
      input.role === PlatformRole.SUPPORT
        ? 'جلسات الدعم الظاهرة لك فقط'
        : 'كل جلسات الدعم النشطة';

    return [
      {
        id: 'total-entities',
        label: 'الصناديق المسجلة',
        value: input.totalEntities,
        caption:
          input.role === PlatformRole.ANALYST
            ? 'رقم مجمع بلا أسماء'
            : 'إجمالي نطاق المنصة',
        tone: 'neutral',
      },
      {
        id: 'pending-review',
        label: 'قيد المراجعة',
        value: input.statusCounts.PENDING_REVIEW,
        caption: 'تحتاج قرار تشغيل أو استكمال بيانات',
        tone: input.statusCounts.PENDING_REVIEW > 0 ? 'attention' : 'positive',
      },
      {
        id: 'suspended',
        label: 'معلقة',
        value: input.statusCounts.SUSPENDED,
        caption: 'عملياتها مقيدة على مستوى المنصة',
        tone: input.statusCounts.SUSPENDED > 0 ? 'blocked' : 'positive',
      },
      {
        id: 'support-sessions',
        label:
          input.role === PlatformRole.SUPPORT ? 'جلساتك النشطة' : 'جلسات دعم نشطة',
        value:
          input.role === PlatformRole.SUPPORT
            ? input.visibleSupportSessionCount
            : input.activeSupportSessionCount,
        caption: supportCaption,
        tone:
          (input.role === PlatformRole.SUPPORT
            ? input.visibleSupportSessionCount
            : input.activeSupportSessionCount) > 0
            ? 'attention'
            : 'positive',
      },
      {
        id: 'pending-appeals',
        label: 'اعتراضات تنتظر الرد',
        value: input.pendingAppealCount,
        caption: 'لا تغلق حتى يصل رد مفهوم للصندوق',
        tone: input.pendingAppealCount > 0 ? 'attention' : 'positive',
      },
      {
        id: 'break-glass-review',
        label: 'وصول طارئ غير مراجع',
        value: input.breakGlassReviewCount,
        caption: 'يحتاج مراجعة داخلية موثقة',
        tone: input.breakGlassReviewCount > 0 ? 'blocked' : 'positive',
      },
    ];
  }

  private buildPrimaryMessage(
    role: PlatformRole,
    actions: PlatformSurfaceActionDto[],
    supportSessions: PlatformSurfaceSupportSessionDto[],
    insights: PlatformSurfaceAggregateInsightDto[],
  ) {
    if (role === PlatformRole.ANALYST) {
      return {
        tone: 'neutral' as PlatformSurfaceTone,
        title: 'سطح مؤشرات مجمعة فقط',
        body: 'ترى صحة التشغيل كأرقام واتجاهات، لا كقوائم أشخاص أو صناديق.',
        nextStep: 'استخدم المؤشرات لتحديد نمط المشكلة، ثم اطلب مسار مراجعة مبرر عند الحاجة.',
      };
    }

    if (role === PlatformRole.SUPPORT) {
      if (supportSessions.length === 0) {
        return {
          tone: 'neutral' as PlatformSurfaceTone,
          title: 'لا توجد جلسة دعم باسمك الآن',
          body: 'الواجهة اليومية لا تفتح لك الصناديق بلا جلسة محددة.',
          nextStep: 'انتظر جلسة دعم مبررة أو اطلب من مشرف المنصة فتح نطاق واضح.',
        };
      }
      return {
        tone: 'attention' as PlatformSurfaceTone,
        title: 'لديك جلسة دعم محددة النطاق',
        body: 'اعمل داخل السبب والنطاق والوقت الظاهر فقط.',
        nextStep: 'لا تفتح بيانات خارج النطاق المكتوب، وأغلق العمل عند انتهاء التذكرة.',
      };
    }

    const firstCritical = actions.find((action) => action.priority === 'critical');
    if (firstCritical) {
      return {
        tone: 'blocked' as PlatformSurfaceTone,
        title: firstCritical.title,
        body: firstCritical.body,
        nextStep: firstCritical.expectedAfterAction,
      };
    }

    const reviewLoad = insights.find((insight) => insight.id === 'aggregate-review-load');
    if ((reviewLoad?.value ?? 0) > 0) {
      return {
        tone: 'attention' as PlatformSurfaceTone,
        title: 'هناك حالات منصة تحتاج قرارًا واضحًا',
        body: 'ابدأ بالاعتراضات والمراجعات بدل تصفح كل جدول الكيانات.',
        nextStep: 'عالج الحالة التي يطلبها النظام ثم اترك التفاصيل كأداة عند الحاجة.',
      };
    }

    return {
      tone: 'positive' as PlatformSurfaceTone,
      title: 'تشغيل المنصة مستقر الآن',
      body: 'لا توجد حالة عاجلة. راقب المؤشرات وجلسات الدعم فقط.',
      nextStep: 'لا تفتح تفاصيل صندوق إلا إذا ظهر سبب محدد أو تذكرة دعم.',
    };
  }

  private buildCapabilities(role: PlatformRole): PlatformSurfaceCapabilityDto[] {
    const canManage = this.canManageEntities(role);
    const isSupport = role === PlatformRole.SUPPORT;
    const isAnalyst = role === PlatformRole.ANALYST;

    return [
      {
        key: 'MANAGE_ENTITY_STATUS',
        label: 'تغيير حالة صندوق',
        isAllowed: canManage,
        reason: canManage
          ? 'مسموح لأن الحساب OWNER أو SUPER_ADMIN.'
          : 'غير مسموح لهذا الدور حتى لا تتحول المنصة إلى وصول مفتوح.',
      },
      {
        key: 'RESPOND_TO_APPEALS',
        label: 'الرد على الاعتراضات',
        isAllowed: canManage,
        reason: canManage
          ? 'يمكنه توثيق رد المنصة على اعتراضات التعليق.'
          : 'الرد الرسمي يتطلب OWNER أو SUPER_ADMIN.',
      },
      {
        key: 'VIEW_SUPPORT_SCOPE',
        label: 'رؤية نطاق جلسة الدعم',
        isAllowed: canManage || isSupport,
        reason: isSupport
          ? 'ترى جلساتك فقط مع نطاقها ووقت انتهائها.'
          : canManage
            ? 'ترى الجلسات النشطة للإشراف عليها.'
            : 'المحلل يرى أرقامًا مجمعة فقط.',
      },
      {
        key: 'OPEN_SUPPORT_SESSION',
        label: 'فتح جلسة دعم',
        isAllowed: canManage,
        reason: canManage
          ? 'فتح الجلسات يجب أن يكون قرارًا إداريًا مبررًا.'
          : 'لا يفتح SUPPORT أو ANALYST جلسة لأنفسهم من الواجهة اليومية.',
      },
      {
        key: 'VIEW_AGGREGATES',
        label: 'مؤشرات مجمعة',
        isAllowed: true,
        reason: 'كل أدوار المنصة ترى مؤشرات مناسبة لدورها.',
      },
      {
        key: 'VIEW_ENTITY_NAMES',
        label: 'أسماء الصناديق',
        isAllowed: !isAnalyst,
        reason: isAnalyst
          ? 'المحلل يرى أرقامًا فقط حتى لا ينكشف سياق شخصي أو حساس.'
          : 'الأسماء تظهر عندما توجد صلاحية تشغيلية أو جلسة دعم.',
      },
    ];
  }

  private buildAdvancedTools(role: PlatformRole) {
    const tools: PlatformSurfaceResponseDto['advancedTools'] = [
      {
        href: '/platform',
        label: 'جدول الكيانات التفصيلي',
        reason: 'للفرز والمراجعة بعد معرفة الحالة المطلوبة من السطح.',
        requiredRole: 'ANY' as const,
      },
    ];
    if (this.canManageEntities(role)) {
      tools.push({
        href: '/platform/appeals',
        label: 'اعتراضات التعليق',
        reason: 'للرد الرسمي عندما يظهر اعتراض يحتاج المنصة.',
        requiredRole: PlatformRole.SUPER_ADMIN,
      });
    }
    return tools;
  }

  private canManageEntities(role: PlatformRole) {
    return role === PlatformRole.OWNER || role === PlatformRole.SUPER_ADMIN;
  }

  private priorityRank(priority: PlatformSurfacePriority) {
    if (priority === 'critical') return 0;
    if (priority === 'urgent') return 1;
    if (priority === 'normal') return 2;
    return 3;
  }

  private entityReviewBody(status: EntityPlatformStatus) {
    if (status === EntityPlatformStatus.PENDING_REVIEW) {
      return 'هذا الصندوق لا يجب أن يظهر كتشغيل مكتمل قبل اكتمال المراجعة.';
    }
    if (status === EntityPlatformStatus.SUSPENDED) {
      return 'هذا الصندوق مقيد؛ يجب أن يعرف مديره سبب التعليق وما المطلوب للعودة.';
    }
    if (status === EntityPlatformStatus.READ_ONLY) {
      return 'هذا الصندوق للمتابعة فقط؛ لا تضف إجراءات تشغيلية جديدة له.';
    }
    return 'لا توجد حالة مراجعة خاصة.';
  }

  private platformRoleLabel(role: PlatformRole) {
    switch (role) {
      case PlatformRole.OWNER:
        return 'مالك المنصة';
      case PlatformRole.SUPER_ADMIN:
        return 'مشرف منصة';
      case PlatformRole.SUPPORT:
        return 'دعم فني';
      case PlatformRole.ANALYST:
        return 'محلل منصة';
    }
  }

  private platformStatusLabel(status: EntityPlatformStatus) {
    switch (status) {
      case EntityPlatformStatus.ACTIVE:
        return 'نشط';
      case EntityPlatformStatus.PENDING_REVIEW:
        return 'قيد المراجعة';
      case EntityPlatformStatus.SUSPENDED:
        return 'معلق';
      case EntityPlatformStatus.READ_ONLY:
        return 'قراءة فقط';
    }
  }

  private entityTypeLabel(type: EntityType) {
    switch (type) {
      case EntityType.FAMILY:
        return 'عائلة';
      case EntityType.TRIBE:
        return 'قبيلة';
      case EntityType.BUILDING:
        return 'عمارة';
      case EntityType.NEIGHBORHOOD:
        return 'حي';
      case EntityType.COMMUNITY:
        return 'مجتمع';
      case EntityType.CAMPAIGN:
        return 'حملة';
    }
  }

  private accessTypeLabel(type: PlatformAccessType) {
    switch (type) {
      case PlatformAccessType.READ:
        return 'قراءة مقيدة';
      case PlatformAccessType.SUPPORT:
        return 'دعم فني';
      case PlatformAccessType.ADMIN_ACTION:
        return 'إجراء إداري';
      case PlatformAccessType.BREAK_GLASS:
        return 'وصول طارئ';
    }
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
}
