import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { RegisterDeviceTokenDto } from './dto/register-device.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'تسجيل الدخول للمطورين (بيئة التطوير فقط)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الدخول بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.username);
  }

  @ApiOperation({
    summary: 'تسجيل حساب جديد برقم الجوال وكلمة المرور وتقديم طلب عضوية لكيان',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء الحساب وطلب العضوية بنجاح',
  })
  @ApiResponse({
    status: 400,
    description: 'بيانات غير صحيحة أو رقم الجوال مسجل مسبقاً',
  })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'تسجيل الدخول برقم الجوال وكلمة المرور' })
  @ApiResponse({
    status: 200,
    description: 'تم تسجيل الدخول بنجاح وإصدار رمز الوصول',
  })
  @ApiResponse({
    status: 400,
    description: 'رقم الجوال أو كلمة المرور غير صحيحة',
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'تسجيل الدخول عبر مزود خارجي (OAuth) - اختياري' })
  @ApiResponse({
    status: 200,
    description: 'تم المصادقة بنجاح وإصدار رمز الوصول',
  })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  async oauthLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin(dto.provider, dto.idToken, dto.name);
  }

  @ApiOperation({ summary: 'تسجيل جهاز لاستقبال إشعارات Push' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الجهاز بنجاح' })
  @Post('device-token')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async registerDeviceToken(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() person: Person,
  ) {
    await this.authService.registerDeviceToken(
      person.id,
      dto.token,
      dto.deviceOs,
    );
    return { message: 'Device token registered' };
  }

  @ApiOperation({ summary: 'تجديد رمز الوصول باستخدام رمز التحديث' })
  @ApiResponse({ status: 200, description: 'تم تجديد رمز الوصول بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'رمز التحديث غير صحيح أو منتهي الصلاحية',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'تسجيل الخروج وإلغاء رمز التحديث' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الخروج بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto, @CurrentUser() person: Person) {
    return this.authService.logout(dto.refreshToken, person.id);
  }

  @ApiOperation({ summary: 'استرجاع بيانات المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'بيانات المستخدم المصادق' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get('me')
  @UseGuards(JwtGuard)
  getMe(@CurrentUser() person: Person) {
    return {
      id: person.id,
      name: person.name,
      username: person.username,
      phoneNumber: person.phoneNumber,
      email: person.email,
      isVerified: person.isVerified,
    };
  }

  @ApiOperation({
    summary: 'تعديل بيانات الحساب (الاسم أو اسم المستخدم أو الإيميل)',
  })
  @ApiResponse({ status: 200, description: 'تم تحديث البيانات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Patch('me')
  @UseGuards(JwtGuard)
  updateMe(@CurrentUser() person: Person, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(person.id, dto);
  }
}
