import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { WorkSurfaceService } from './work-surface.service';

@ApiTags('work-surface')
@ApiBearerAuth('access-token')
@UseGuards(JwtGuard)
@Controller('work-surface')
export class WorkSurfaceController {
  constructor(private readonly workSurfaceService: WorkSurfaceService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'سطح العمل اليومي للمستخدم: المطلوب والفائدة والاستثناءات دون كشف بنية النظام الداخلية',
  })
  getMySurface(@CurrentUser() user: Person) {
    return this.workSurfaceService.getForPerson(user.id);
  }
}
