import { Module } from '@nestjs/common';
import { PlatformEntitiesService } from './platform-entities.service';
import { PlatformEntitiesController } from './platform-entities.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformEntitiesController],
  providers: [PlatformEntitiesService],
  exports: [PlatformEntitiesService],
})
export class PlatformEntitiesModule {}
