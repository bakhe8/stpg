import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { SubscribeDto } from './dto/subscribe.dto';
import type { Person } from '@prisma/client';
import { CreatePaymentRecordDto } from './dto/create-payment-record.dto';
import {
  ApprovePaymentRecordDto,
  RejectPaymentRecordDto,
} from './dto/review-payment-record.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
@UseGuards(JwtGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // الاشتراك في مسار
  @ApiOperation({ summary: 'الاشتراك في مسار ادخار' })
  @ApiResponse({ status: 201, description: 'تم الاشتراك بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المسار غير موجود' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  subscribe(
    @Query('pathId') pathId: string,
    @Body() dto: SubscribeDto,
    @CurrentUser() user: Person,
  ) {
    return this.subscriptionsService.subscribe(pathId, user.id, dto);
  }

  // اشتراكات عضوية / مسار / كيان
  @ApiOperation({
    summary: 'استرجاع قائمة الاشتراكات (خاصة بمسار أو عضوية أو كيان)',
  })
  @ApiResponse({ status: 200, description: 'قائمة الاشتراكات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get()
  findSubscriptions(
    @Query('membershipId') membershipId: string,
    @Query('pathId') pathId: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: Person,
  ) {
    if (entityId) {
      return this.subscriptionsService.findEntitySubscriptions(
        entityId,
        user.id,
      );
    }
    if (membershipId) {
      return this.subscriptionsService.findMemberSubscriptions(
        membershipId,
        user.id,
      );
    }
    if (!pathId) {
      return this.subscriptionsService.findMySubscriptions(user.id);
    }
    return this.subscriptionsService.findPathSubscriptions(pathId, user.id);
  }

  @ApiOperation({ summary: 'التحقق من توافق الاشتراك مع المسار' })
  @ApiResponse({ status: 200, description: 'نتيجة التحقق من التوافق' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Get(':id/compatibility')
  getCompatibility(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.getCompatibility(id, user.id);
  }

  @ApiOperation({ summary: 'تأكيد الاشتراك من قِبل العضو' })
  @ApiResponse({ status: 200, description: 'تم تأكيد الاشتراك بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Put(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.confirm(id, user.id);
  }

  // تفعيل اشتراك (مدير)
  @ApiOperation({ summary: 'تفعيل اشتراك من قِبل المدير' })
  @ApiResponse({ status: 200, description: 'تم تفعيل الاشتراك بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.activate(id, user.id);
  }

  // تعليق اشتراك (مدير)
  @ApiOperation({ summary: 'تعليق اشتراك من قِبل المدير' })
  @ApiResponse({ status: 200, description: 'تم تعليق الاشتراك بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.suspend(id, user.id);
  }

  @ApiOperation({ summary: 'تعليق اشتراك من قِبل المدير (مسار موثق بديل)' })
  @ApiResponse({ status: 200, description: 'تم تعليق الاشتراك بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Put(':id/suspend')
  suspendDocumentedRoute(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.suspend(id, user.id);
  }

  // الانسحاب من مسار
  @ApiOperation({ summary: 'الانسحاب من مسار الادخار' })
  @ApiResponse({ status: 200, description: 'تم الانسحاب بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  exit(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.exit(id, user.id);
  }

  @ApiOperation({ summary: 'الانسحاب من مسار الادخار (مسار موثق بديل)' })
  @ApiResponse({ status: 200, description: 'تم الانسحاب بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Put(':id/exit')
  exitDocumentedRoute(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.subscriptionsService.exit(id, user.id);
  }

  // الدفعات المستحقة
  @ApiOperation({ summary: 'استرجاع الدفعات المستحقة على المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'قائمة الدفعات المستحقة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get('payment-dues/my')
  getMyDues(@CurrentUser() user: Person) {
    return this.subscriptionsService.getMyPaymentDues(user.id);
  }

  @ApiOperation({ summary: 'استرجاع سجلات الدفع الخاصة بالمستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات الدفع' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get('payment-records/my')
  getMyPaymentRecords(@CurrentUser() user: Person) {
    return this.subscriptionsService.getMyPaymentRecords(user.id);
  }

  @ApiOperation({ summary: 'استرجاع سجلات الدفع لكيان معين' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات الدفع للكيان' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get('payment-records')
  getEntityPaymentRecords(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.subscriptionsService.getEntityPaymentRecords(entityId, user.id);
  }

  @ApiOperation({ summary: 'إنشاء سجل دفع جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء سجل الدفع بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Post('payment-records')
  @HttpCode(HttpStatus.CREATED)
  createPaymentRecord(
    @CurrentUser() user: Person,
    @Body() dto: CreatePaymentRecordDto,
  ) {
    return this.subscriptionsService.createPaymentRecord(user.id, dto);
  }

  @ApiOperation({ summary: 'اعتماد سجل دفع من قِبل المدير' })
  @ApiResponse({ status: 200, description: 'تم اعتماد سجل الدفع بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'سجل الدفع غير موجود' })
  @Patch('payment-records/:id/approve')
  approvePaymentRecord(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePaymentRecordDto,
  ) {
    return this.subscriptionsService.approvePaymentRecord(id, user.id, dto);
  }

  @ApiOperation({ summary: 'رفض سجل دفع من قِبل المدير' })
  @ApiResponse({ status: 200, description: 'تم رفض سجل الدفع' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'سجل الدفع غير موجود' })
  @Patch('payment-records/:id/reject')
  rejectPaymentRecord(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPaymentRecordDto,
  ) {
    return this.subscriptionsService.rejectPaymentRecord(id, user.id, dto);
  }

  @ApiOperation({ summary: 'إلغاء سجل دفع من قِبل صاحبه' })
  @ApiResponse({ status: 200, description: 'تم إلغاء سجل الدفع' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'سجل الدفع غير موجود' })
  @Patch('payment-records/:id/cancel')
  cancelPaymentRecord(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionsService.cancelPaymentRecord(id, user.id);
  }

  @ApiOperation({ summary: 'توليد الدفعات المستحقة لاشتراك معين' })
  @ApiResponse({ status: 200, description: 'تم توليد الدفعات المستحقة بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الاشتراك غير موجود' })
  @Patch(':id/generate-dues')
  generateDues(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptionsService.generatePaymentDuesForRequester(
      id,
      user.id,
    );
  }
}
