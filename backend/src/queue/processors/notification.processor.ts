import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { NotificationTargetType, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NOTIFICATIONS, JOB_SEND_NOTIFICATION } from '../queue.constants';

export interface SendNotificationJobData {
  personId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetType?: NotificationTargetType;
  targetId?: string;
}

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(JOB_SEND_NOTIFICATION)
  async sendNotification(job: Job<SendNotificationJobData>) {
    const { personId, type, title, body, targetType, targetId } = job.data;
    this.logger.debug(`Sending notification to ${personId}: ${title}`);

    await this.prisma.notification.create({
      data: {
        personId,
        type,
        title,
        body,
        targetType,
        targetId,
      },
    });
  }
}
