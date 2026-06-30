import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { UpdateWalletPolicyDto } from './dto/update-wallet-policy.dto';
import { CloseWalletDto } from './dto/close-wallet.dto';
import { SetWalletOwnershipDto } from './dto/set-wallet-ownership.dto';
import type { Person } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('wallets')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @ApiOperation({ summary: 'إنشاء محفظة مالية جديدة لكيان' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المحفظة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Query('entityId') entityId: string,
    @Body() dto: CreateWalletDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.createWallet(entityId, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع قائمة محافظ كيان معين' })
  @ApiResponse({ status: 200, description: 'قائمة المحافظ' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get()
  findEntityWallets(
    @Query('entityId') entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.findEntityWallets(entityId, user.id);
  }

  @ApiOperation({ summary: 'استرجاع تفاصيل محفظة بمعرّفها' })
  @ApiResponse({ status: 200, description: 'تفاصيل المحفظة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.walletsService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'تحديث بيانات محفظة مالية' })
  @ApiResponse({ status: 200, description: 'تم تحديث المحفظة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.updateWallet(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع سياسة المحفظة المالية' })
  @ApiResponse({ status: 200, description: 'سياسة المحفظة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Get(':id/policy')
  getPolicy(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.walletsService.getPolicy(id, user.id);
  }

  @ApiOperation({ summary: 'تحديث سياسة المحفظة المالية' })
  @ApiResponse({ status: 200, description: 'تم تحديث السياسة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Patch(':id/policy')
  updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateWalletPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.updatePolicy(id, user.id, dto);
  }

  @ApiOperation({ summary: 'تحديث سياسة المحفظة المالية (مسار موثق بديل)' })
  @ApiResponse({ status: 200, description: 'تم تحديث السياسة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Put(':id/policy')
  updatePolicyDocumentedRoute(
    @Param('id') id: string,
    @Body() dto: UpdateWalletPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.updatePolicy(id, user.id, dto);
  }

  @ApiOperation({ summary: 'إغلاق محفظة مالية' })
  @ApiResponse({ status: 201, description: 'تم إغلاق المحفظة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() dto: CloseWalletDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.closeWallet(id, user.id, dto);
  }

  @ApiOperation({ summary: 'تعيين ملكية المحفظة المالية' })
  @ApiResponse({ status: 200, description: 'تم تعيين الملكية بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Put(':id/ownership')
  setOwnership(
    @Param('id') id: string,
    @Body() dto: SetWalletOwnershipDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.setWalletOwnership(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع تقرير ملكية المحفظة المالية' })
  @ApiResponse({ status: 200, description: 'تقرير الملكية' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  @Get(':id/ownership')
  getOwnershipReport(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.walletsService.getWalletOwnershipReport(id, user.id);
  }
}
