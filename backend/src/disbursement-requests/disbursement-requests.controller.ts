import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisbursementRequestsService } from './disbursement-requests.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { CreateDisbursementRequestDto } from './dto/create-disbursement-request.dto';
import {
  ApproveDisbursementRequestDto,
  RejectDisbursementRequestDto,
  ExecuteDisbursementRequestDto,
} from './dto/review-disbursement-request.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('disbursements')
@ApiBearerAuth('access-token')
@Controller('disbursement-requests')
@UseGuards(JwtGuard)
export class DisbursementRequestsController {
  constructor(private readonly service: DisbursementRequestsService) {}

  // إنشاء طلب صرف
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: Person,
    @Query('pathId', ParseUUIDPipe) pathId: string,
    @Body() dto: CreateDisbursementRequestDto,
  ) {
    return this.service.createRequest(user.id, pathId, dto);
  }

  // قائمة الطلبات لمسار معين
  @Get()
  findByPath(
    @CurrentUser() user: Person,
    @Query('pathId', ParseUUIDPipe) pathId: string,
  ) {
    return this.service.findPathRequests(pathId, user.id);
  }

  // تفاصيل طلب واحد
  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, user.id);
  }

  // اعتماد الطلب (مدير/أمين صندوق)
  @Patch(':id/approve')
  approve(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDisbursementRequestDto,
  ) {
    return this.service.approveRequest(id, user.id, dto);
  }

  // رفض الطلب
  @Patch(':id/reject')
  reject(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDisbursementRequestDto,
  ) {
    return this.service.rejectRequest(id, user.id, dto);
  }

  // تنفيذ الطلب (تسجيل في الدفتر المالي)
  @Patch(':id/execute')
  execute(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteDisbursementRequestDto,
  ) {
    return this.service.executeRequest(id, user.id, dto);
  }

  // إلغاء الطلب من قِبَل مقدِّمه
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelRequest(id, user.id);
  }
}
