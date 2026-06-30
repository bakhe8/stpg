import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('decisions')
@ApiBearerAuth('access-token')
@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @ApiOperation({ summary: 'إنشاء قرار تصويتي جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء القرار بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @Post()
  createDecision(@CurrentUser() user: Person, @Body() dto: CreateDecisionDto) {
    return this.decisionsService.createDecision(user.id, dto);
  }

  @ApiOperation({
    summary: 'استرجاع قائمة القرارات (لمسار محدد أو القرارات المتاحة)',
  })
  @ApiResponse({ status: 200, description: 'قائمة القرارات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get()
  findPathDecisions(
    @CurrentUser() user: Person,
    @Query('pathId') pathId?: string,
  ) {
    if (!pathId) {
      return this.decisionsService.findAccessibleDecisions(user.id);
    }
    return this.decisionsService.findPathDecisions(pathId, user.id);
  }

  @ApiOperation({ summary: 'استرجاع تفاصيل قرار بمعرّفه' })
  @ApiResponse({ status: 200, description: 'تفاصيل القرار' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'تسجيل صوت على قرار' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الصوت بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Post(':id/vote')
  castVote(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.decisionsService.castVote(id, user.id, dto);
  }

  @ApiOperation({ summary: 'تسجيل صوت على قرار (مسار موثق بديل)' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الصوت بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Post(':id/votes')
  castVoteDocumentedRoute(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CastVoteDto,
  ) {
    return this.decisionsService.castVote(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع قائمة أصوات قرار معين' })
  @ApiResponse({ status: 200, description: 'قائمة الأصوات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Get(':id/votes')
  getVotes(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.getVotes(id, user.id);
  }

  @ApiOperation({ summary: 'إغلاق قرار وتنفيذ نتيجة التصويت' })
  @ApiResponse({ status: 200, description: 'تم إغلاق القرار بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Patch(':id/close')
  closeDecision(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.closeDecision(id, user.id);
  }

  @ApiOperation({ summary: 'إغلاق قرار وتنفيذ نتيجة التصويت (مسار موثق بديل)' })
  @ApiResponse({ status: 201, description: 'تم إغلاق القرار بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Post(':id/close')
  closeDecisionDocumentedRoute(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.closeDecision(id, user.id);
  }

  @ApiOperation({ summary: 'إعادة محاولة تنفيذ قرار فشل تنفيذه' })
  @ApiResponse({ status: 201, description: 'تمت إعادة المحاولة بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Post(':id/retry-execution')
  retryExecution(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.retryExecution(id, user.id);
  }

  @ApiOperation({ summary: 'تنفيذ أثر قرار معتمد أو إعادة محاولة التنفيذ' })
  @ApiResponse({ status: 201, description: 'تم التنفيذ أو إعادة المحاولة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'القرار غير موجود' })
  @Post(':id/execute')
  executeDecision(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionsService.retryExecution(id, user.id);
  }
}
