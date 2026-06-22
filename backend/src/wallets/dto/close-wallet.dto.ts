import { IsUUID } from 'class-validator';

export class CloseWalletDto {
  @IsUUID()
  decisionId: string;
}
