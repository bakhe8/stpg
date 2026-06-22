import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GovernancePathsService } from './governance-paths.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreatePathDto } from './dto/create-path.dto';
import { UpdatePathDto } from './dto/update-path.dto';
import { UpdatePathPolicyDto } from './dto/update-path-policy.dto';
import { ClosePathDto } from './dto/close-path.dto';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@ApiTags('governance-paths')
@ApiBearerAuth('access-token')
@Controller('paths')
@UseGuards(JwtGuard)
export class GovernancePathsController {
  constructor(private readonly pathsService: GovernancePathsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Query('walletId') walletId: string,
    @Body() dto: CreatePathDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.createPath(walletId, user.id, dto);
  }

  @Get()
  findWalletPaths(
    @Query('walletId') walletId: string,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.findWalletPaths(walletId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.pathsService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePathDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.updatePath(id, user.id, dto);
  }

  @Get(':id/policy')
  getPolicy(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.pathsService.getPolicy(id, user.id);
  }

  @Patch(':id/policy')
  updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdatePathPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.updatePolicy(id, user.id, dto);
  }

  @Put(':id/policy')
  updatePolicyDocumentedRoute(
    @Param('id') id: string,
    @Body() dto: UpdatePathPolicyDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.updatePolicy(id, user.id, dto);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() dto: ClosePathDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.closePath(id, user.id, dto);
  }
}
