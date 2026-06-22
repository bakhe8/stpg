import { Controller, Get, UseGuards } from '@nestjs/common';
import { EntityTemplatesService } from './entity-templates.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@UseGuards(JwtGuard)
@ApiTags('entities')
@ApiBearerAuth('access-token')
@Controller('entity-templates')
export class EntityTemplatesController {
  constructor(private readonly service: EntityTemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
