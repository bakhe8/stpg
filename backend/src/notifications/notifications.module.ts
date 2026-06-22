import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PUSH_PROVIDER } from './push-provider.interface';
import { WebPushProviderService } from './web-push-provider.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: PUSH_PROVIDER,
      useClass: WebPushProviderService,
    },
  ],
  exports: [NotificationsService, PUSH_PROVIDER],
})
export class NotificationsModule {}
