import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/)
  profileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profileLabel?: string;
}
