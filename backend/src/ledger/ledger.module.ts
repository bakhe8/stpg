import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, RulesModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
