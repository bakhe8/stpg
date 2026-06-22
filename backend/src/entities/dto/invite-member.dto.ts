import { IsString, Matches, IsIn, IsOptional } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class InviteMemberDto {
  @IsString()
  @Matches(/^(\+9665|05)\d{8}$/, {
    message: 'رقم الجوال غير صحيح — يجب أن يكون 05xxxxxxxx أو +9665xxxxxxxx',
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn([
    MemberRole.ADMIN,
    MemberRole.TREASURER,
    MemberRole.AUDITOR,
    MemberRole.COMMITTEE_MEMBER,
    MemberRole.MEMBER,
  ])
  role?: MemberRole;
}
