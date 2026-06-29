import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';
import { CurrentPlatformUser } from '../identity/auth/decorators/current-platform-user.decorator';
import { PlatformSurfaceService } from './platform-surface.service';

type PlatformUser = {
  id: string;
  email?: string;
  name?: string;
  role?: PlatformRole;
  isActive?: boolean;
};

@Controller('platform/surface')
@AllowPlatform()
@UseGuards(JwtGuard, PlatformGuard)
export class PlatformSurfaceController {
  constructor(private readonly service: PlatformSurfaceService) {}

  @Get('me')
  getMySurface(@CurrentPlatformUser() operator: PlatformUser) {
    return this.service.getForOperator(operator);
  }
}
