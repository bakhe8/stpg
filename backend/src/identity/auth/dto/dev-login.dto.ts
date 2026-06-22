import { IsString, IsNotEmpty } from 'class-validator';

export class DevLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'الرجاء إدخال اسم المستخدم' })
  username!: string;
}
