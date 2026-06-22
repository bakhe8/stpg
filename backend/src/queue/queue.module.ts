import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AppealsModule } from '../appeals/appeals.module';
import { QueueService } from './queue.service';
import { SubscriptionProcessor } from './processors/subscription.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AppealsProcessor } from './processors/appeals.processor';
import { QUEUE_SUBSCRIPTIONS, QUEUE_NOTIFICATIONS } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_SUBSCRIPTIONS },
      { name: QUEUE_NOTIFICATIONS },
    ),
    PrismaModule,
    AppealsModule,
  ],
  providers: [
    QueueService,
    SubscriptionProcessor,
    NotificationProcessor,
    AppealsProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
