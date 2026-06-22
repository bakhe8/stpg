import { IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(MemberRole)
  role: MemberRole;
}
