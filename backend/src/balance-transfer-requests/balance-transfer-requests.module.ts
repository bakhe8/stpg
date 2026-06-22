import { Module } from '@nestjs/common';
import { BalanceTransferRequestsService } from './balance-transfer-requests.service';
import { BalanceTransferRequestsController } from './balance-transfer-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RulesModule } from '../rules/rules.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [PrismaModule, RulesModule, LedgerModule],
  controllers: [BalanceTransferRequestsController],
  providers: [BalanceTransferRequestsService],
})
export class BalanceTransferRequestsModule {}
