import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { BeneficiariesService } from './beneficiaries.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('beneficiaries')
@ApiBearerAuth('access-token')
@Controller('beneficiaries')
@UseGuards(JwtGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Get()
  findByEntity(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.beneficiariesService.findByEntity(entityId, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiariesService.create(entityId, user.id, dto);
  }
}
