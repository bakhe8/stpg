import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { DocumentedSubscriptionsController } from './documented-subscriptions.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [NotificationsModule, LedgerModule, RulesModule],
  controllers: [SubscriptionsController, DocumentedSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
