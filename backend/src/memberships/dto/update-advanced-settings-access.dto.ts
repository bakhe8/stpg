import { IsBoolean } from 'class-validator';

export class UpdateAdvancedSettingsAccessDto {
  @IsBoolean()
  canManageAdvancedSettings: boolean;
}
