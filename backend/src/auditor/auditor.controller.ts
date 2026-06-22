import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditorService } from './auditor.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@ApiTags('auditor')
@ApiBearerAuth('access-token')
@Controller('auditor')
@UseGuards(JwtGuard)
export class AuditorController {
  constructor(private readonly auditorService: AuditorService) {}

  @Get(':entityId/operations')
  getOperations() {
    return this.auditorService.getOperations();
  }

  @Get(':entityId/documents')
  getDocuments(@Param('entityId') entityId: string) {
    return this.auditorService.getDocuments(entityId);
  }

  @Get(':entityId/decisions')
  getDecisions(@Param('entityId') entityId: string) {
    return this.auditorService.getDecisions(entityId);
  }

  @Get(':entityId/exceptions')
  getExceptions(@Param('entityId') entityId: string) {
    return this.auditorService.getExceptions(entityId);
  }

  @Get(':entityId/conflicts')
  getConflicts() {
    return this.auditorService.getConflicts();
  }

  @Get(':entityId/appeals')
  getAppeals(@Param('entityId') entityId: string) {
    return this.auditorService.getAppeals(entityId);
  }

  @Get(':entityId/report')
  getReport(@Param('entityId') entityId: string) {
    return this.auditorService.getReport(entityId);
  }

  @Get(':entityId/audit-logs')
  getAuditLogs(@Param('entityId') entityId: string) {
    return this.auditorService.getAuditLogs(entityId);
  }
}
