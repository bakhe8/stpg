import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
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
    await this.dispatchPushNotifications([input]);
    return notif;
  }

  // ── إنشاء إشعارات جماعية لمجموعة أشخاص ─────────────────────────
  async createBulk(inputs: CreateNotificationInput[]) {
    const notifs = await this.prisma.notification.createMany({ data: inputs });
    await this.dispatchPushNotifications(inputs);
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
    if (personIds.length === 0) return;

    // Get device tokens
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { personId: { in: personIds }, isActive: true },
    });

    if (deviceTokens.length === 0) return;

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

    await Promise.all(promises.flat());
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
