import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  QUEUE_SUBSCRIPTIONS,
  QUEUE_NOTIFICATIONS,
  JOB_PROCESS_DUE_SUBSCRIPTIONS,
  JOB_ESCALATE_OVERDUE_APPEALS,
  JOB_SEND_NOTIFICATION,
} from './queue.constants';
import type { SendNotificationJobData } from './processors/notification.processor';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_SUBSCRIPTIONS) private readonly subQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS) private readonly notifQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleDailySubscriptionCheck();
    await this.scheduleAppealsEscalationCheck();
  }

  async scheduleDailySubscriptionCheck() {
    await this.subQueue.add(
      JOB_PROCESS_DUE_SUBSCRIPTIONS,
      {},
      {
        repeat: { cron: '0 8 * * *', tz: 'Asia/Riyadh' },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    this.logger.log('Daily subscription check scheduled (08:00)');
  }

  async queueNotification(data: SendNotificationJobData) {
    await this.notifQueue.add(JOB_SEND_NOTIFICATION, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 20,
    });
  }

  async scheduleAppealsEscalationCheck() {
    await this.subQueue.add(
      JOB_ESCALATE_OVERDUE_APPEALS,
      {},
      {
        repeat: { cron: '*/15 * * * *', tz: 'Asia/Riyadh' },
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    );
    this.logger.log('Overdue appeals escalation check scheduled (every 15m)');
  }

  async triggerSubscriptionCheck() {
    return this.subQueue.add(
      JOB_PROCESS_DUE_SUBSCRIPTIONS,
      {},
      {
        removeOnComplete: true,
      },
    );
  }
}
