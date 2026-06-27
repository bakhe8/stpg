import {
  Controller,
  Get,
  Post,
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
import { EntitiesService } from './entities.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { UpdateEntityPolicyDto } from './dto/update-entity-policy.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  CreateSubEntityDto,
  CreateCampaignDto,
} from './dto/create-sub-entity.dto';
import type { Person } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('entities')
@ApiBearerAuth('access-token')
@Controller('entities')
@UseGuards(JwtGuard)
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @ApiOperation({ summary: 'إنشاء كيان (صندوق أو جمعية) جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الكيان بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEntityDto, @CurrentUser() user: Person) {
    return this.entitiesService.createEntity(user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع الكيانات الخاصة بالمستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'قائمة الكيانات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @Get('mine')
  findMine(@CurrentUser() user: Person) {
    return this.entitiesService.findMyEntities(user.id);
  }

  @ApiOperation({ summary: 'استرجاع تفاصيل كيان بمعرّفه' })
  @ApiResponse({ status: 200, description: 'تفاصيل الكيان' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'تحديث بيانات كيان موجود' })
  @ApiResponse({ status: 200, description: 'تم تحديث الكيان بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEntityDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.updateEntity(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع سياسة الحوكمة للكيان' })
  @ApiResponse({ status: 200, description: 'سياسة الكيان' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/policy')
  getPolicy(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getPolicy(id, user.id);
  }

  @Get(':id/policy/impact')
  getPolicyImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('field') field: string,
    @Query('value') value: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.getPolicyImpact(id, user.id, field, value);
  }

  @ApiOperation({ summary: 'تحديث سياسة الحوكمة للكيان' })
  @ApiResponse({ status: 200, description: 'تم تحديث السياسة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Patch(':id/policy')
  updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateEntityPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.updatePolicy(id, user.id, dto);
  }

  @ApiOperation({ summary: 'تحديث سياسة الحوكمة للكيان (مسار موثق بديل)' })
  @ApiResponse({ status: 201, description: 'تم تحديث السياسة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Post(':id/policy')
  updatePolicyDocumentedRoute(
    @Param('id') id: string,
    @Body() dto: UpdateEntityPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.updatePolicy(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع قائمة أعضاء الكيان' })
  @ApiResponse({ status: 200, description: 'قائمة الأعضاء' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getMembers(id, user.id);
  }

  @ApiOperation({ summary: 'استرجاع قائمة عضويات الكيان (مسار موثق بديل)' })
  @ApiResponse({ status: 200, description: 'قائمة العضويات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/memberships')
  getMemberships(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getMembers(id, user.id);
  }

  @ApiOperation({ summary: 'خيارات الأطراف المتاحة عند فتح نزاع' })
  @ApiResponse({ status: 200, description: 'أسماء ومعرفات أعضاء الكيان فقط' })
  @Get(':id/dispute-respondents')
  getDisputeRespondents(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getDisputeRespondentOptions(id, user.id);
  }

  @ApiOperation({ summary: 'دعوة عضو جديد للانضمام إلى الكيان' })
  @ApiResponse({ status: 201, description: 'تم إرسال الدعوة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.inviteMember(id, user.id, dto);
  }

  @ApiOperation({ summary: 'طلب الانضمام إلى كيان' })
  @ApiResponse({ status: 201, description: 'تم إرسال طلب الانضمام بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  requestToJoin(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.requestToJoin(id, user.id);
  }

  @ApiOperation({ summary: 'طلب العضوية في كيان (مسار موثق بديل)' })
  @ApiResponse({ status: 201, description: 'تم إرسال طلب العضوية بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Post(':id/memberships')
  @HttpCode(HttpStatus.CREATED)
  requestMembership(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.requestToJoin(id, user.id);
  }

  // Sub-entities
  @ApiOperation({ summary: 'إنشاء كيان فرعي تابع لكيان رئيسي' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الكيان الفرعي بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان الرئيسي غير موجود' })
  @Post(':id/sub-entities')
  @HttpCode(HttpStatus.CREATED)
  createSubEntity(
    @Param('id') id: string,
    @Body() dto: CreateSubEntityDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.createSubEntity(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع قائمة الكيانات الفرعية لكيان رئيسي' })
  @ApiResponse({ status: 200, description: 'قائمة الكيانات الفرعية' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/sub-entities')
  listSubEntities(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.listSubEntities(id, user.id);
  }

  @ApiOperation({ summary: 'استرجاع التسلسل الهرمي للكيانات' })
  @ApiResponse({ status: 200, description: 'التسلسل الهرمي للكيانات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/hierarchy')
  getHierarchy(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getHierarchy(id, user.id);
  }

  @ApiOperation({ summary: 'استرجاع التقرير المالي للكيانات الفرعية' })
  @ApiResponse({ status: 200, description: 'التقرير المالي للكيانات الفرعية' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/sub-entities-report')
  getSubEntitiesReport(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.getSubEntitiesFinancialReport(id, user.id);
  }

  // Campaigns
  @ApiOperation({ summary: 'إنشاء حملة تبرع جديدة تابعة لكيان' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحملة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Post(':id/campaigns')
  @HttpCode(HttpStatus.CREATED)
  createCampaign(
    @Param('id') id: string,
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.createCampaign(id, user.id, dto);
  }

  @ApiOperation({ summary: 'استرجاع قائمة الحملات التابعة لكيان' })
  @ApiResponse({ status: 200, description: 'قائمة الحملات' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 404, description: 'الكيان غير موجود' })
  @Get(':id/campaigns')
  listCampaigns(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.entitiesService.listCampaigns(id, user.id);
  }

  @ApiOperation({ summary: 'تصدير بيانات الكيان — متاح حتى حال التعليق' })
  @ApiResponse({ status: 200, description: 'بيانات الكيان كاملة' })
  @Get(':id/export')
  exportEntityData(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.exportEntityData(id, user.id);
  }

  @ApiOperation({ summary: 'تقديم اعتراض على تعليق الكيان من المنصة' })
  @ApiResponse({ status: 201, description: 'تم تقديم الاعتراض' })
  @Post(':id/platform-appeal')
  @HttpCode(HttpStatus.CREATED)
  submitSuspensionAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.submitSuspensionAppeal(
      id,
      user.id,
      body.reason,
    );
  }

  @ApiOperation({ summary: 'استرجاع الاعتراضات المقدمة لكيان' })
  @ApiResponse({ status: 200, description: 'قائمة الاعتراضات' })
  @Get(':id/platform-appeals')
  getEntitySuspensionAppeals(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.getEntitySuspensionAppeals(id, user.id);
  }

  @ApiOperation({ summary: 'أرشفة حملة تبرع وإيقافها' })
  @ApiResponse({ status: 200, description: 'تم أرشفة الحملة بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصادق' })
  @ApiResponse({ status: 403, description: 'غير مصرح' })
  @ApiResponse({ status: 404, description: 'الحملة غير موجودة' })
  @Delete(':id/campaigns/:campaignId/archive')
  archiveCampaign(
    @Param('id') parentId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.archiveCampaign(parentId, campaignId, user.id);
  }

  @Get(':id/closure-checklist')
  getClosureChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.getClosureChecklist(id, user.id);
  }

  @Post(':id/request-closure')
  requestClosure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: Person,
  ) {
    return this.entitiesService.requestClosure(id, user.id, reason ?? '');
  }
}
