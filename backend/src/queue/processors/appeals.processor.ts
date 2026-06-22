import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { AppealsService } from '../../appeals/appeals.service';
import {
  JOB_ESCALATE_OVERDUE_APPEALS,
  QUEUE_SUBSCRIPTIONS,
} from '../queue.constants';

@Processor(QUEUE_SUBSCRIPTIONS)
export class AppealsProcessor {
  private readonly logger = new Logger(AppealsProcessor.name);

  constructor(private readonly appealsService: AppealsService) {}

  @Process(JOB_ESCALATE_OVERDUE_APPEALS)
  async escalateOverdueAppeals(job: Job) {
    this.logger.log(`Escalating overdue appeals — job ${job.id}`);

    const result = await this.appealsService.escalateOverdueAppeals();

    this.logger.log(
      `Escalated ${result.escalatedCount} overdue appeals automatically`,
    );

    return result;
  }
}
