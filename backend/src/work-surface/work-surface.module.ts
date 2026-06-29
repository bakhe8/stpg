import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkSurfaceController } from './work-surface.controller';
import { WorkSurfaceService } from './work-surface.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkSurfaceController],
  providers: [WorkSurfaceService],
})
export class WorkSurfaceModule {}
