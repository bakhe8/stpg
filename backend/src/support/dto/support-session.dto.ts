import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateSupportSessionDto {
  @IsString()
  @IsNotEmpty()
  scope: string;

  @IsInt()
  @Min(1)
  @Max(72)
  hours: number;
}
