import { Test, TestingModule } from '@nestjs/testing';
import { BalanceTransferRequestsService } from './balance-transfer-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { LedgerService } from '../ledger/ledger.service';

describe('BalanceTransferRequestsService', () => {
  let service: BalanceTransferRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceTransferRequestsService,
        { provide: PrismaService, useValue: {} },
        { provide: RulesService, useValue: {} },
        { provide: LedgerService, useValue: {} },
      ],
    }).compile();

    service = module.get<BalanceTransferRequestsService>(
      BalanceTransferRequestsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
