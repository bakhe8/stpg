import { Controller, Post, Body, UseGuards, Param, Req } from '@nestjs/common';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async executeTransfer(
    @Body() dto: { sourceWalletId: string; targetWalletId: string; amount: number; reason: string },
  ) {
    return this.transfersService.executeAutomatedTransfer(
      dto.sourceWalletId,
      dto.targetWalletId,
      dto.amount,
      dto.reason
    );
  }
}
