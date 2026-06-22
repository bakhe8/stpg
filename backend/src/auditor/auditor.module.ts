import { Module } from '@nestjs/common';
import { AuditorService } from './auditor.service';
import { AuditorController } from './auditor.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditorController],
  providers: [AuditorService],
})
export class AuditorModule {}
