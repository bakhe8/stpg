import { Module } from '@nestjs/common';
import { EntityRelationshipsService } from './entity-relationships.service';
import { EntityRelationshipsController } from './entity-relationships.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EntityRelationshipsViewController } from './entity-relationships-view.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, NotificationsModule, RulesModule],
  controllers: [
    EntityRelationshipsController,
    EntityRelationshipsViewController,
  ],
  providers: [EntityRelationshipsService],
  exports: [EntityRelationshipsService],
})
export class EntityRelationshipsModule {}
