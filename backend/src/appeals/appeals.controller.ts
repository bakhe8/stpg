import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { FileAppealDto } from './dto/file-appeal.dto';
import { RespondAppealDto } from './dto/respond-appeal.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('appeals')
@ApiBearerAuth('access-token')
@Controller('appeals')
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Post()
  fileAppeal(@CurrentUser() user: Person, @Body() dto: FileAppealDto) {
    return this.appealsService.fileAppeal(user.id, dto);
  }

  @Get()
  findDecisionAppeals(
    @CurrentUser() user: Person,
    @Query('decisionId', ParseUUIDPipe) decisionId: string,
  ) {
    return this.appealsService.findDecisionAppeals(decisionId, user.id);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appealsService.findById(id, user.id);
  }

  @Patch(':id/respond')
  respond(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondAppealDto,
  ) {
    return this.appealsService.respondToAppeal(id, user.id, dto);
  }
}
