import { Module } from '@nestjs/common';
import { PlatformAccessLogService } from './platform-access-log.service';
import { PlatformAccessInterceptor } from './platform-access.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PlatformAccessLogService, PlatformAccessInterceptor],
  exports: [PlatformAccessLogService, PlatformAccessInterceptor],
})
export class PlatformAccessLogModule {}
