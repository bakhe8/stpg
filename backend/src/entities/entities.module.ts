import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesController } from './entities.controller';
import { EntityTemplatesService } from './entity-templates.service';
import { EntityTemplatesController } from './entity-templates.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EntitiesController, EntityTemplatesController],
  providers: [EntitiesService, EntityTemplatesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
