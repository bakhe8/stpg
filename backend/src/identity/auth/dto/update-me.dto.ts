import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/, {
    message:
      'اسم المستخدم يجب أن يبدأ بحرف ويتكون من 3 إلى 32 حرفاً إنجليزياً أو رقماً أو شرطة سفلية',
  })
  username?: string;
}
