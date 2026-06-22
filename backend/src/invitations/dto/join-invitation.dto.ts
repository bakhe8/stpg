import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class JoinInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  relationshipDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sponsorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
