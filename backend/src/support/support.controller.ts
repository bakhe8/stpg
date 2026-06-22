import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('sessions/:entityId')
  async getSessions(@Param('entityId') entityId: string) {
    return this.supportService.getActiveSessions(entityId);
  }

  @Post('sessions')
  async createSession(@Body() dto: { entityId: string; platformAccountId: string; scope: string; hours: number }) {
    return this.supportService.requestSupportAccess(dto.entityId, dto.platformAccountId, dto.scope, dto.hours);
  }

  @Post('sessions/:id/revoke')
  async revokeSession(@Param('id') sessionId: string, @Body() dto: { entityId: string }) {
    return this.supportService.revokeSupportAccess(sessionId, dto.entityId);
  }
}
