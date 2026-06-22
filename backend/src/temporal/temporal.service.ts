import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Connection, Client } from '@temporalio/client';

@Injectable()
export class TemporalService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(TemporalService.name);

  async onModuleInit() {
    try {
      // Connect to the default Temporal server (localhost:7233)
      const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
      this.client = new Client({
        connection,
        // namespace: 'default', // optional
      });
      this.logger.log('Connected to Temporal Server');
    } catch (err) {
      this.logger.warn('Temporal Server connection failed. Workflows will not be dispatched.');
    }
  }

  async dispatchWorkflow(workflowName: string, args: any[], workflowId: string) {
    if (!this.client) {
      this.logger.warn(`Cannot dispatch workflow ${workflowName} because Temporal client is not connected.`);
      return null;
    }
    
    try {
      const handle = await this.client.workflow.start(workflowName, {
        args,
        taskQueue: 'stgp-tasks',
        workflowId,
      });
      this.logger.log(`Started workflow ${workflowName} with ID ${handle.workflowId}`);
      return handle;
    } catch (err) {
      this.logger.error(`Failed to start workflow ${workflowName}`, err);
      throw err;
    }
  }
}
