import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: Person, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(user.id, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: Person) {
    return this.documentsService.findMyDocuments(user.id);
  }

  @Get()
  findByEntity(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.documentsService.findEntityDocuments(entityId, user.id);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.findById(id, user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.deleteDocument(id, user.id);
  }
}
