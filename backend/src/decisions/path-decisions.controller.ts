import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import type { Person } from '@prisma/client';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { DecisionsService } from './decisions.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('decisions')
@ApiBearerAuth('access-token')
@Controller('paths')
export class PathDecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get(':pathId/decisions')
  findPathDecisions(
    @CurrentUser() user: Person,
    @Param('pathId', ParseUUIDPipe) pathId: string,
  ) {
    return this.decisionsService.findPathDecisions(pathId, user.id);
  }
}
