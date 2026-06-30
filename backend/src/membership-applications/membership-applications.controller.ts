import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { ReviewMembershipApplicationDto } from './dto/review-membership-application.dto';
import { MembershipApplicationsService } from './membership-applications.service';

@Controller('membership-applications')
export class MembershipApplicationsController {
  constructor(private readonly service: MembershipApplicationsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: Person) {
    return this.service.findMine(user.id);
  }

  @Get('entity/:entityId')
  findByEntity(
    @Param('entityId') entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.service.findByEntity(entityId, user.id);
  }

  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ReviewMembershipApplicationDto,
    @CurrentUser() user: Person,
  ) {
    return this.service.approve(id, user.id, dto.reviewerNotes);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewMembershipApplicationDto,
    @CurrentUser() user: Person,
  ) {
    return this.service.reject(id, user.id, dto.reviewerNotes);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.service.cancel(id, user.id);
  }
}
