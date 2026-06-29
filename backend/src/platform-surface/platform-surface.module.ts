import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformSurfaceController } from './platform-surface.controller';
import { PlatformSurfaceService } from './platform-surface.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformSurfaceController],
  providers: [PlatformSurfaceService],
})
export class PlatformSurfaceModule {}
