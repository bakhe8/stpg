import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreatePlatformAccountDto } from './dto/create-platform-account.dto';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { CurrentPlatformUser } from '../identity/auth/decorators/current-platform-user.decorator';
import { PlatformRole } from '@prisma/client';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('platform-auth')
@AllowPlatform()
export class PlatformAuthController {
  constructor(private readonly service: PlatformAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  // نقطة تهيئة المنصة لأول مرة — محمية بـ bootstrap secret في الـ header
  @Public()
  @Post('bootstrap')
  bootstrap(
    @Body() body: { email: string; password: string; name: string },
    @Headers('x-bootstrap-secret') secret: string,
  ) {
    if (secret !== process.env.PLATFORM_BOOTSTRAP_SECRET) {
      throw new ForbiddenException('Bootstrap secret غير صحيح');
    }
    return this.service.createFirstOwner(body.email, body.password, body.name);
  }

  // إنشاء حسابات Platform — يتطلب OWNER أو SUPER_ADMIN
  @Post('accounts')
  @UseGuards(PlatformGuard)
  createAccount(
    @Body() dto: CreatePlatformAccountDto,
    @CurrentPlatformUser() operator: { role: PlatformRole },
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('إنشاء الحسابات يتطلب OWNER أو SUPER_ADMIN');
    }
    return this.service.createAccount(
      dto.email,
      dto.password,
      dto.name,
      dto.role,
    );
  }
}
