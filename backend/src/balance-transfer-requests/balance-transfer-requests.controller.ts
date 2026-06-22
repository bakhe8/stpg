import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { BalanceTransferRequestsService } from './balance-transfer-requests.service';
import {
  CreateTransferRequestDto,
  ReviewTransferDto,
} from './dto/balance-transfer.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('balance-transfers')
@ApiBearerAuth('access-token')
@Controller('balance-transfer-requests')
export class BalanceTransferRequestsController {
  constructor(
    private readonly transferRequestsService: BalanceTransferRequestsService,
  ) {}

  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateTransferRequestDto,
  ) {
    return this.transferRequestsService.createRequest(req.user.id, dto);
  }

  @Get('path/:pathId')
  findByPath(
    @Request() req: { user: { id: string } },
    @Param('pathId') pathId: string,
  ) {
    return this.transferRequestsService.findPathTransfers(pathId, req.user.id);
  }

  @Get(':id')
  findById(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.transferRequestsService.findById(id, req.user.id);
  }

  @Post(':id/review')
  review(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: ReviewTransferDto,
  ) {
    return this.transferRequestsService.reviewRequest(id, req.user.id, dto);
  }

  @Post(':id/execute')
  execute(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.transferRequestsService.executeRequest(id, req.user.id);
  }
}
