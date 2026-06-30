import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordDisbursementDto } from './dto/record-disbursement.dto';
import { RecordTransferDto } from './dto/record-transfer.dto';
import { RecordReversalDto } from './dto/record-reversal.dto';
import { RecordEntitySupportDto } from './dto/record-entity-support.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('ledger')
@ApiBearerAuth('access-token')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @ApiOperation({ summary: 'تسجيل دفعة اشتراك في دفتر الأستاذ' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الدفعة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المورد غير موجود' })
  @Post('payments')
  recordPayment(@CurrentUser() user: Person, @Body() dto: RecordPaymentDto) {
    return this.ledgerService.recordPayment(user.id, dto);
  }

  @ApiOperation({ summary: 'تسجيل صرف مبلغ من دفتر الأستاذ' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الصرف بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المورد غير موجود' })
  @Post('disbursements')
  recordDisbursement(
    @CurrentUser() user: Person,
    @Body() dto: RecordDisbursementDto,
  ) {
    return this.ledgerService.recordDisbursement(user.id, dto);
  }

  @ApiOperation({ summary: 'تسجيل تحويل بين حسابين في دفتر الأستاذ' })
  @ApiResponse({ status: 201, description: 'تم تسجيل التحويل بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المورد غير موجود' })
  @Post('transfers')
  recordTransfer(@CurrentUser() user: Person, @Body() dto: RecordTransferDto) {
    return this.ledgerService.recordTransfer(user.id, dto);
  }

  @ApiOperation({ summary: 'تسجيل دعم مالي لكيان في دفتر الأستاذ' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الدعم بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المورد غير موجود' })
  @Post('entity-support')
  recordEntitySupport(
    @CurrentUser() user: Person,
    @Body() dto: RecordEntitySupportDto,
  ) {
    return this.ledgerService.recordEntitySupport(user.id, dto);
  }

  @ApiOperation({ summary: 'تسجيل عكس معاملة مالية سابقة' })
  @ApiResponse({ status: 201, description: 'تم تسجيل العكس بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المعاملة غير موجودة' })
  @Post('transactions/:transactionId/reversal')
  recordReversal(
    @CurrentUser() user: Person,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: RecordReversalDto,
  ) {
    return this.ledgerService.recordReversal(transactionId, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع ملخص الحسابات المالية لكيان' })
  @ApiResponse({ status: 200, description: 'ملخص الحسابات المالية' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get('summary')
  getEntitySummary(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.ledgerService.getEntitySummary(entityId, user.id);
  }

  @ApiOperation({ summary: 'استرجاع قائمة المعاملات لحساب معين' })
  @ApiResponse({ status: 200, description: 'قائمة المعاملات المالية' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الحساب غير موجود' })
  @Get('accounts/:accountId/transactions')
  getAccountTransactions(
    @CurrentUser() user: Person,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.ledgerService.getAccountTransactions(accountId, user.id);
  }

  @ApiOperation({ summary: 'أخذ لقطة مالية للحساب في لحظة زمنية محددة' })
  @ApiResponse({ status: 201, description: 'تم أخذ اللقطة بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الحساب غير موجود' })
  @Post('accounts/:accountId/snapshot')
  takeSnapshot(
    @CurrentUser() user: Person,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.ledgerService.takeSnapshot(accountId, user.id);
  }
}
