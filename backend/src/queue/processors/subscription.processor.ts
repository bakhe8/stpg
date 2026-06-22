import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationTargetType,
  NotificationType,
  SubscriptionFrequency,
  SubscriptionState,
} from '@prisma/client';
import {
  QUEUE_SUBSCRIPTIONS,
  JOB_PROCESS_DUE_SUBSCRIPTIONS,
} from '../queue.constants';

@Processor(QUEUE_SUBSCRIPTIONS)
export class SubscriptionProcessor {
  private readonly logger = new Logger(SubscriptionProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(JOB_PROCESS_DUE_SUBSCRIPTIONS)
  async processDueSubscriptions(job: Job) {
    this.logger.log(`Processing due subscriptions — job ${job.id}`);

    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        state: {
          in: [SubscriptionState.ACTIVE, SubscriptionState.SUPPORTER_ONLY],
        },
      },
      include: {
        membership: {
          select: { person: { select: { id: true, name: true } } },
        },
        governancePath: {
          select: {
            id: true,
            name: true,
            wallet: {
              select: {
                policy: { select: { subscriptionFrequency: true } },
              },
            },
          },
        },
      },
      take: 200,
    });

    let processed = 0;
    for (const subscription of subscriptions) {
      const latestPaymentAudit = await this.prisma.auditLog.findFirst({
        where: {
          targetType: 'ledger_transactions',
          newValue: {
            path: ['subscriptionId'],
            equals: subscription.id,
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const frequency =
        subscription.governancePath.wallet.policy?.subscriptionFrequency ??
        SubscriptionFrequency.MONTHLY;
      const dueAt = this.nextDueDate(
        latestPaymentAudit?.createdAt ??
          subscription.activeAt ??
          subscription.interestedAt,
        frequency,
      );
      if (dueAt > now) continue;

      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          personId: subscription.membership.person.id,
          type: NotificationType.PAYMENT_DUE,
          targetType: NotificationTargetType.SUBSCRIPTION,
          targetId: subscription.id,
          sentAt: { gte: dueAt },
        },
        select: { id: true },
      });
      if (existingNotification) continue;

      await this.prisma.notification.create({
        data: {
          personId: subscription.membership.person.id,
          type: NotificationType.PAYMENT_DUE,
          title: 'استحقاق اشتراك',
          body: `اشتراكك في مسار "${subscription.governancePath.name}" مستحق الدفع الآن.`,
          targetType: NotificationTargetType.SUBSCRIPTION,
          targetId: subscription.id,
        },
      });
      processed += 1;
    }

    this.logger.log(`Created ${processed} payment-due notifications`);
    return { processed };
  }

  private nextDueDate(current: Date, frequency: SubscriptionFrequency): Date {
    const d = new Date(current);
    switch (frequency) {
      case SubscriptionFrequency.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case SubscriptionFrequency.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case SubscriptionFrequency.ANNUAL:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d;
  }
}
