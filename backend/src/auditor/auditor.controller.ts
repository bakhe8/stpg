import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuditorService } from './auditor.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';

@ApiTags('auditor')
@ApiBearerAuth('access-token')
@Controller('auditor')
export class AuditorController {
  constructor(private readonly auditorService: AuditorService) {}

  @Get(':entityId/operations')
  getOperations(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getOperations(entityId, user.id);
  }

  @Get(':entityId/documents')
  getDocuments(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getDocuments(entityId, user.id);
  }

  @Get(':entityId/decisions')
  getDecisions(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getDecisions(entityId, user.id);
  }

  @Get(':entityId/exceptions')
  getExceptions(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getExceptions(entityId, user.id);
  }

  @Get(':entityId/conflicts')
  getConflicts(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getConflicts(entityId, user.id);
  }

  @Get(':entityId/appeals')
  getAppeals(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getAppeals(entityId, user.id);
  }

  @Get(':entityId/report')
  getReport(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getReport(entityId, user.id);
  }

  @Get(':entityId/audit-logs')
  getAuditLogs(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.auditorService.getAuditLogs(entityId, user.id);
  }
}
