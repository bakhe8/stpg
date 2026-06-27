import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { RuleTargetType } from '@prisma/client';
import { CreateRuleDto, UpdateRuleDto } from './dto/create-rule.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('rules')
@ApiBearerAuth('access-token')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get('templates')
  getTemplates() {
    return this.rulesService.getTemplates();
  }

  @Post()
  create(@CurrentUser() user: Person, @Body() dto: CreateRuleDto) {
    return this.rulesService.createRule(user.id, dto);
  }

  @Get()
  findByTarget(
    @CurrentUser() user: Person,
    @Query('targetType', new ParseEnumPipe(RuleTargetType))
    targetType: RuleTargetType,
    @Query('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.rulesService.findTargetRules(targetType, targetId, user.id);
  }

  @Get('evaluate')
  evaluate(
    @CurrentUser() user: Person,
    @Query('pathId', ParseUUIDPipe) pathId: string,
    @Query('amount') amount: string,
    @Query('spendingItemId') spendingItemId?: string,
    @Query('attachmentsCount') attachmentsCount?: string,
  ) {
    return this.rulesService.evaluateSpendingRules(
      pathId,
      parseFloat(amount),
      spendingItemId,
      {
        attachmentsCount: parseInt(attachmentsCount ?? '0', 10) || 0,
      },
    );
  }

  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rulesService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.updateRule(id, user.id, dto);
  }
}
