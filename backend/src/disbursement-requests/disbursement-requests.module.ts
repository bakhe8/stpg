import { Module } from '@nestjs/common';
import { DisbursementRequestsService } from './disbursement-requests.service';
import { DisbursementRequestsController } from './disbursement-requests.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [DisbursementRequestsController],
  providers: [DisbursementRequestsService],
  exports: [DisbursementRequestsService],
})
export class DisbursementRequestsModule {}
