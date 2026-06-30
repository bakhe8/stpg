import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JoinInvitationDto } from './dto/join-invitation.dto';
import { JoinInvitationContextDto } from './dto/join-invitation-context.dto';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { Person } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiOperation({ summary: 'إنشاء رابط دعوة لكيان (المؤسس أو المدير فقط)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء رابط الدعوة' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiBearerAuth('access-token')
  @Post()
  createInvitation(
    @CurrentUser() user: Person,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(user.id, dto);
  }

  @ApiOperation({ summary: 'معاينة بيانات الكيان عبر رابط الدعوة (عام)' })
  @ApiResponse({ status: 200, description: 'بيانات الكيان المدعو إليه' })
  @ApiResponse({ status: 404, description: 'رابط الدعوة غير موجود' })
  @Public()
  @Get(':token/preview')
  getPreview(@Param('token') token: string) {
    return this.invitationsService.getInvitationPreview(token);
  }

  @ApiOperation({ summary: 'تقديم طلب انضمام عبر رابط الدعوة (حساب جديد)' })
  @ApiResponse({ status: 200, description: 'تم تقديم الطلب وإصدار JWT' })
  @ApiResponse({ status: 404, description: 'رابط الدعوة غير موجود' })
  @ApiResponse({ status: 403, description: 'الرابط غير فعال أو منتهي' })
  @Public()
  @Post(':token/join')
  @HttpCode(HttpStatus.OK)
  join(@Body() dto: JoinInvitationDto, @Param('token') token: string) {
    return this.invitationsService.joinViaInvitation(token, dto);
  }

  @ApiOperation({ summary: 'تقديم طلب انضمام لمستخدم مسجل دخوله' })
  @ApiResponse({ status: 200, description: 'تم تقديم طلب الانضمام' })
  @ApiResponse({ status: 409, description: 'أنت عضو أو لديك طلب قائم' })
  @ApiBearerAuth('access-token')
  @Post(':token/join-me')
  @HttpCode(HttpStatus.OK)
  joinAuthenticated(
    @CurrentUser() user: Person,
    @Param('token') token: string,
    @Body() dto: JoinInvitationContextDto,
  ) {
    return this.invitationsService.joinViaInvitationAuthenticated(
      token,
      user.id,
      dto,
    );
  }
}
