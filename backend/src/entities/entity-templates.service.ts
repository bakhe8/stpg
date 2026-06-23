import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { toJsonValue } from '../prisma/json-value';

function toNullableJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined || value === null
    ? Prisma.JsonNull
    : toJsonValue(value);
}

@Injectable()
export class EntityTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.entityTemplate.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const tpl = await this.prisma.entityTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('القالب غير موجود');
    return tpl;
  }

  async create(dto: CreateTemplateDto) {
    return this.prisma.entityTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        icon: dto.icon,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        enabledModules: toNullableJson(dto.enabledModules),
        suggestedGoals: toNullableJson(dto.suggestedGoals),
        defaultPolicy: toNullableJson(dto.defaultPolicy),
        defaultWallets: toNullableJson(dto.defaultWallets),
        defaultPaths: toNullableJson(dto.defaultPaths),
      },
    });
  }

  async update(id: string, dto: Partial<CreateTemplateDto>) {
    await this.findOne(id);
    const data: Prisma.EntityTemplateUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    };

    if (dto.enabledModules !== undefined) {
      data.enabledModules = toNullableJson(dto.enabledModules);
    }
    if (dto.suggestedGoals !== undefined) {
      data.suggestedGoals = toNullableJson(dto.suggestedGoals);
    }
    if (dto.defaultPolicy !== undefined) {
      data.defaultPolicy = toNullableJson(dto.defaultPolicy);
    }
    if (dto.defaultWallets !== undefined) {
      data.defaultWallets = toNullableJson(dto.defaultWallets);
    }
    if (dto.defaultPaths !== undefined) {
      data.defaultPaths = toNullableJson(dto.defaultPaths);
    }

    return this.prisma.entityTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.entityTemplate.delete({ where: { id } });
  }
}
