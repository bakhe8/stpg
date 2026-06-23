import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { PlatformRole } from '@prisma/client';

export class CreatePlatformAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsEnum(PlatformRole)
  role: PlatformRole;
}
