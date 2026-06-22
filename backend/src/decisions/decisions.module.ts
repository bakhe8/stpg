import { Module } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { DecisionsController } from './decisions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PathDecisionsController } from './path-decisions.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { HouseholdsModule } from '../households/households.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule, HouseholdsModule, RulesModule],
  controllers: [DecisionsController, PathDecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
