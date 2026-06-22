import { IsUUID } from 'class-validator';

export class ClosePathDto {
  @IsUUID()
  decisionId: string;
}
