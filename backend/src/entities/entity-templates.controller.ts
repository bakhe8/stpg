import { Controller, Get } from '@nestjs/common';
import { EntityTemplatesService } from './entity-templates.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

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
