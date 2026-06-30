import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AdminController],
})
export class AdminModule {}
