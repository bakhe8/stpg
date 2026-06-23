import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EntityTemplatesService } from './entity-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('entity-templates')
@ApiBearerAuth('access-token')
@Controller('entity-templates')
export class EntityTemplatesController {
  constructor(private readonly service: EntityTemplatesService) {}

  /** للمستخدمين العاديين — القوالب النشطة فقط */
  @UseGuards(JwtGuard)
  @AllowPlatform()
  @Get()
  findAll(@Query('all') all?: string) {
    return this.service.findAll(all === 'true');
  }

  /** للمشغّل فقط — إنشاء قالب جديد */
  @UseGuards(JwtGuard, PlatformGuard)
  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }

  /** للمشغّل فقط — تعديل قالب */
  @UseGuards(JwtGuard, PlatformGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.service.update(id, dto);
  }

  /** للمشغّل فقط — حذف قالب */
  @UseGuards(JwtGuard, PlatformGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
