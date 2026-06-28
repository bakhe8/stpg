import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AuditAction,
  MemberRole,
  NotificationType,
  NotificationTargetType,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUSH_PROVIDER } from './push-provider.interface';
import type { IPushProvider } from './push-provider.interface';

export interface CreateNotificationInput {
  personId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetType?: NotificationTargetType;
  targetId?: string;
}

export interface NotificationRecipientMatrixRow {
  id: string;
  event: string;
  notificationType: NotificationType;
  targetType: NotificationTargetType;
  recipientRule: string;
  source: string;
  delivery: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: IPushProvider,
  ) {}

  // ── تسجيل اشتراك أجهزة الـ Push ──────────────────────────────────
  async subscribeDevice(
    personId: string,
    subscription: any,
    deviceOs: string = 'web',
  ) {
    const tokenStr =
      typeof subscription === 'string'
        ? subscription
        : JSON.stringify(subscription);

    // Check if it already exists
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: tokenStr },
    });

    if (existing) {
      if (existing.personId !== personId || !existing.isActive) {
        return this.prisma.deviceToken.update({
          where: { id: existing.id },
          data: { personId, isActive: true, deviceOs },
        });
      }
      return existing;
    }

    return this.prisma.deviceToken.create({
      data: {
        personId,
        token: tokenStr,
        deviceOs,
        isActive: true,
      },
    });
  }

  async unsubscribeDevice(personId: string, subscription: any) {
    const tokenStr =
      typeof subscription === 'string'
        ? subscription
        : JSON.stringify(subscription);

    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: tokenStr },
    });

    if (existing && existing.personId === personId) {
      return this.prisma.deviceToken.delete({
        where: { id: existing.id },
      });
    }
    return null;
  }

  // ── إنشاء إشعار (تُستدعى داخلياً من الوحدات الأخرى) ────────────
  async create(input: CreateNotificationInput) {
    const notif = await this.prisma.notification.create({ data: input });
    await this.auditNotificationEvent('CREATED', [input], notif.id);
    try {
      const delivery = await this.dispatchPushNotifications([input]);
      await this.auditNotificationEvent('PUSH_DISPATCHED', [input], notif.id, {
        attemptedDevices: delivery.attemptedDevices,
      });
    } catch (error) {
      await this.auditNotificationFailure([input], error, notif.id);
    }
    return notif;
  }

  // ── إنشاء إشعارات جماعية لمجموعة أشخاص ─────────────────────────
  async createBulk(inputs: CreateNotificationInput[]) {
    const notifs = await this.prisma.notification.createMany({ data: inputs });
    await this.auditNotificationEvent('CREATED_BULK', inputs);
    try {
      const delivery = await this.dispatchPushNotifications(inputs);
      await this.auditNotificationEvent('PUSH_DISPATCHED', inputs, undefined, {
        attemptedDevices: delivery.attemptedDevices,
      });
    } catch (error) {
      await this.auditNotificationFailure(inputs, error);
    }
    return notifs;
  }

  private async dispatchPushNotifications(inputs: CreateNotificationInput[]) {
    // Group by personId
    const personMap = new Map<string, CreateNotificationInput[]>();
    for (const input of inputs) {
      if (!personMap.has(input.personId)) {
        personMap.set(input.personId, []);
      }
      personMap.get(input.personId)!.push(input);
    }

    const personIds = Array.from(personMap.keys());
    if (personIds.length === 0) return { attemptedDevices: 0 };

    // Get device tokens
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { personId: { in: personIds }, isActive: true },
    });

    if (deviceTokens.length === 0) return { attemptedDevices: 0 };

    // Dispatch
    const promises = deviceTokens.map((device) => {
      const inputsForPerson = personMap.get(device.personId) || [];
      return inputsForPerson.map((input) =>
        this.pushProvider.sendToDevice(device.token, {
          title: input.title,
          body: input.body,
          data: {
            targetType: input.targetType ?? '',
            targetId: input.targetId ?? '',
            type: input.type,
          },
        }),
      );
    });

    const jobs = promises.flat();
    await Promise.all(jobs);
    return { attemptedDevices: jobs.length };
  }

  private async auditNotificationEvent(
    status: 'CREATED' | 'CREATED_BULK' | 'PUSH_DISPATCHED',
    inputs: CreateNotificationInput[],
    notificationId?: string,
    extra?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: inputs.length === 1 ? inputs[0]?.personId : undefined,
          targetType: notificationId ? 'notifications' : 'notification_dispatches',
          targetId: notificationId ?? randomUUID(),
          newValue: {
            status,
            count: inputs.length,
            types: [...new Set(inputs.map((input) => input.type))],
            recipientIds: inputs.map((input) => input.personId),
            targetType: inputs[0]?.targetType ?? null,
            targetId: inputs[0]?.targetId ?? null,
            ...extra,
          },
        },
      });
    } catch {
      // Notification audit should never block the notification itself.
    }
  }

  private async auditNotificationFailure(
    inputs: CreateNotificationInput[],
    error: unknown,
    notificationId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.REJECT,
          personId: inputs.length === 1 ? inputs[0]?.personId : undefined,
          targetType: notificationId ? 'notifications' : 'notification_dispatches',
          targetId: notificationId ?? randomUUID(),
          newValue: {
            status: 'PUSH_FAILED',
            count: inputs.length,
            types: [...new Set(inputs.map((input) => input.type))],
            recipientIds: inputs.map((input) => input.personId),
            targetType: inputs[0]?.targetType ?? null,
            targetId: inputs[0]?.targetId ?? null,
            reason: error instanceof Error ? error.message : 'Unknown push failure',
          },
        },
      });
    } catch {
      // Preserve the original notification workflow even if failure auditing fails.
    }
  }

  // ── إشعارات المستخدم ─────────────────────────────────────────────
  async getMyNotifications(personId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: {
        personId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(personId: string) {
    const count = await this.prisma.notification.count({
      where: { personId, isRead: false },
    });
    return { unread: count };
  }

  getRecipientMatrix(): NotificationRecipientMatrixRow[] {
    return [
      {
        id: 'decision-created',
        event: 'DECISION_CREATED',
        notificationType: NotificationType.VOTE_REQUIRED,
        targetType: NotificationTargetType.DECISION,
        recipientRule: 'DECISION_SCOPE',
        source: 'NotificationsService.notifyDecisionCreated',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'payment-confirmed',
        event: 'PAYMENT_CONFIRMED',
        notificationType: NotificationType.PAYMENT_CONFIRMED,
        targetType: NotificationTargetType.SUBSCRIPTION,
        recipientRule: 'PAYMENT_OWNER',
        source: 'NotificationsService.notifyPaymentRecorded',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'payment-due',
        event: 'PAYMENT_DUE',
        notificationType: NotificationType.PAYMENT_DUE,
        targetType: NotificationTargetType.SUBSCRIPTION,
        recipientRule: 'PAYMENT_OWNER',
        source: 'SubscriptionProcessor.notifyDuePayments',
        delivery: 'IN_APP',
      },
      {
        id: 'appeal-filed',
        event: 'APPEAL_FILED',
        notificationType: NotificationType.APPEAL_UPDATE,
        targetType: NotificationTargetType.APPEAL,
        recipientRule: 'ENTITY_ADMINS_FOUNDERS',
        source: 'NotificationsService.notifyAppealFiled',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'policy-changed',
        event: 'POLICY_CHANGED',
        notificationType: NotificationType.POLICY_CHANGED,
        targetType: NotificationTargetType.ENTITY,
        recipientRule: 'ACTIVE_MEMBERS_EXCEPT_ACTOR',
        source: 'NotificationsService.notifyPolicyChanged',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'governance-changed',
        event: 'GOVERNANCE_CHANGED',
        notificationType: NotificationType.GOVERNANCE_CHANGED,
        targetType: NotificationTargetType.GOVERNANCE_PATH,
        recipientRule: 'AFFECTED_SUBSCRIBERS',
        source: 'NotificationsService.notifyGovernanceChanged',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'relationship-request',
        event: 'RELATIONSHIP_REQUESTED',
        notificationType: NotificationType.RELATIONSHIP_REQUEST,
        targetType: NotificationTargetType.ENTITY_RELATIONSHIP,
        recipientRule: 'TARGET_ENTITY_ADMINS_FOUNDERS',
        source: 'NotificationsService.notifyRelationshipRequest',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'relationship-approved',
        event: 'RELATIONSHIP_APPROVED',
        notificationType: NotificationType.RELATIONSHIP_REQUEST,
        targetType: NotificationTargetType.ENTITY_RELATIONSHIP,
        recipientRule: 'SOURCE_ENTITY_ADMINS_FOUNDERS',
        source: 'NotificationsService.notifyRelationshipApproved',
        delivery: 'IN_APP_AND_ACTIVE_PUSH',
      },
      {
        id: 'membership-approved',
        event: 'MEMBERSHIP_APPLICATION_APPROVED',
        notificationType: NotificationType.MEMBERSHIP_APPLICATION_APPROVED,
        targetType: NotificationTargetType.ENTITY,
        recipientRule: 'APPLICANT',
        source: 'MembershipApplicationsService.approve',
        delivery: 'IN_APP',
      },
      {
        id: 'membership-rejected',
        event: 'MEMBERSHIP_APPLICATION_REJECTED',
        notificationType: NotificationType.MEMBERSHIP_APPLICATION_REJECTED,
        targetType: NotificationTargetType.ENTITY,
        recipientRule: 'APPLICANT',
        source: 'MembershipApplicationsService.reject',
        delivery: 'IN_APP',
      },
      {
        id: 'campaign-expired',
        event: 'CAMPAIGN_EXPIRED',
        notificationType: NotificationType.CAMPAIGN_EXPIRED,
        targetType: NotificationTargetType.ENTITY,
        recipientRule: 'ENTITY_ADMINS_FOUNDERS',
        source: 'Campaign expiry job',
        delivery: 'IN_APP',
      },
      {
        id: 'platform-access',
        event: 'PLATFORM_ACCESS',
        notificationType: NotificationType.PLATFORM_ACCESS,
        targetType: NotificationTargetType.ENTITY,
        recipientRule: 'ENTITY_ADMINS_FOUNDERS',
        source: 'PlatformAccessLogService',
        delivery: 'IN_APP',
      },
    ];
  }

  async markRead(id: string, personId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('الإشعار غير موجود');
    if (notif.personId !== personId) throw new ForbiddenException('ليس إشعارك');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(personId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { personId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async deleteNotification(id: string, personId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('الإشعار غير موجود');
    if (notif.personId !== personId) throw new ForbiddenException('ليس إشعارك');

    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }

  // ── مساعدات للإشعارات المعيارية ─────────────────────────────────

  async notifyDecisionCreated(
    entityId: string,
    decisionId: string,
    decisionTitle: string,
    votersScope: VotersScope,
    governancePathId?: string,
  ) {
    let personIds: string[] = [];

    if (votersScope === VotersScope.PATH_SUBSCRIBERS && governancePathId) {
      const subs = await this.prisma.subscription.findMany({
        where: { governancePathId, state: 'ACTIVE' },
        include: { membership: { select: { personId: true } } },
      });
      personIds = subs.map((s) => s.membership.personId);
    } else {
      const members = await this.prisma.membership.findMany({
        where: { entityId, isActive: true },
        select: { personId: true },
      });
      personIds = members.map((m) => m.personId);
    }

    if (personIds.length === 0) return;

    await this.createBulk(
      personIds.map((pid) => ({
        personId: pid,
        type: NotificationType.VOTE_REQUIRED,
        title: 'قرار يحتاج تصويتك',
        body: `تم فتح قرار جديد: ${decisionTitle}`,
        targetType: NotificationTargetType.DECISION,
        targetId: decisionId,
      })),
    );
  }

  async notifyPaymentRecorded(
    memberPersonId: string,
    amount: number,
    subscriptionId: string,
  ) {
    await this.create({
      personId: memberPersonId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'تم تسجيل دفعتك',
      body: `تم تسجيل دفعتك بمبلغ ${amount} ريال`,
      targetType: NotificationTargetType.SUBSCRIPTION,
      targetId: subscriptionId,
    });
  }

  async notifyAppealFiled(
    entityId: string,
    appealId: string,
    decisionTitle: string,
  ) {
    const admins = await this.prisma.membership.findMany({
      where: {
        entityId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
      select: { personId: true },
    });

    if (admins.length === 0) return;

    await this.createBulk(
      admins.map((a) => ({
        personId: a.personId,
        type: NotificationType.APPEAL_UPDATE,
        title: 'اعتراض جديد على قرار',
        body: `تم تقديم اعتراض على القرار: ${decisionTitle}`,
        targetType: NotificationTargetType.APPEAL,
        targetId: appealId,
      })),
    );
  }

  async notifyPolicyChanged(
    entityId: string,
    policyType: string,
    changedById: string,
  ) {
    const members = await this.prisma.membership.findMany({
      where: { entityId, isActive: true, personId: { not: changedById } },
      select: { personId: true },
    });

    if (members.length === 0) return;

    await this.createBulk(
      members.map((m) => ({
        personId: m.personId,
        type: NotificationType.POLICY_CHANGED,
        title: 'تم تعديل سياسة',
        body: `تم تعديل سياسة ${policyType} في الكيان`,
        targetType: NotificationTargetType.ENTITY,
        targetId: entityId,
      })),
    );
  }

  async notifyGovernanceChanged(
    pathId: string,
    suspendedPersonIds: string[],
    pathName: string,
  ) {
    if (suspendedPersonIds.length === 0) return;

    await this.createBulk(
      suspendedPersonIds.map((pid) => ({
        personId: pid,
        type: NotificationType.GOVERNANCE_CHANGED,
        title: 'تغيير في مسار الحوكمة',
        body: `تم تعديل سياسة الحوكمة في المسار "${pathName}". يمكنك مراجعة الشروط الجديدة، ولك الحق في الاعتراض خلال فترة السماح أو الانسحاب دون غرامة.`,
        targetType: NotificationTargetType.GOVERNANCE_PATH,
        targetId: pathId,
      })),
    );
  }

  async notifyRelationshipRequest(
    targetEntityId: string,
    sourceEntityName: string,
    relationshipId: string,
  ) {
    const admins = await this.prisma.membership.findMany({
      where: {
        entityId: targetEntityId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
      select: { personId: true },
    });

    if (admins.length === 0) return;

    await this.createBulk(
      admins.map((a) => ({
        personId: a.personId,
        type: NotificationType.RELATIONSHIP_REQUEST,
        title: 'طلب ربط كيان',
        body: `طلب كيان "${sourceEntityName}" إنشاء علاقة مع كيانك. يرجى المراجعة والموافقة أو الرفض.`,
        targetType: NotificationTargetType.ENTITY_RELATIONSHIP,
        targetId: relationshipId,
      })),
    );
  }

  async notifyRelationshipApproved(
    sourceEntityId: string,
    targetEntityName: string,
    relationshipId: string,
  ) {
    const admins = await this.prisma.membership.findMany({
      where: {
        entityId: sourceEntityId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
      select: { personId: true },
    });

    if (admins.length === 0) return;

    await this.createBulk(
      admins.map((a) => ({
        personId: a.personId,
        type: NotificationType.RELATIONSHIP_REQUEST,
        title: 'تم الموافقة على ربط الكيان',
        body: `وافق كيان "${targetEntityName}" على إنشاء العلاقة معكم.`,
        targetType: NotificationTargetType.ENTITY_RELATIONSHIP,
        targetId: relationshipId,
      })),
    );
  }

  async notifyPaymentDue(
    personId: string,
    amount: number,
    dueDate: Date,
    pathName: string,
    subscriptionId: string,
  ) {
    await this.create({
      personId,
      type: NotificationType.PAYMENT_DUE,
      title: 'دفعة اشتراك مستحقة',
      body: `دفعتك في المسار "${pathName}" بمبلغ ${amount} ريال مستحقة بتاريخ ${dueDate.toLocaleDateString('ar-SA')}`,
      targetType: NotificationTargetType.SUBSCRIPTION,
      targetId: subscriptionId,
    });
  }
}
