import { Test, TestingModule } from '@nestjs/testing';
import { BalanceTransferRequestsController } from './balance-transfer-requests.controller';
import { BalanceTransferRequestsService } from './balance-transfer-requests.service';

describe('BalanceTransferRequestsController', () => {
  let controller: BalanceTransferRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceTransferRequestsController],
      providers: [
        {
          provide: BalanceTransferRequestsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BalanceTransferRequestsController>(
      BalanceTransferRequestsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
