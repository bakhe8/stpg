import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, RulesModule],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
