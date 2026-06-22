import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(SearchService.name);

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
    });
  }

  async onModuleInit() {
    try {
      const info = await this.client.info();
      this.logger.log(`Connected to OpenSearch: ${info.body.version.number}`);
      await this.initIndices();
    } catch (err) {
      this.logger.warn('OpenSearch connection failed. Please ensure OpenSearch is running.');
    }
  }

  private async initIndices() {
    const indices = ['entities', 'members', 'rules'];
    for (const index of indices) {
      const exists = await this.client.indices.exists({ index });
      if (!exists.body) {
        await this.client.indices.create({ index });
        this.logger.log(`Created index: ${index}`);
      }
    }
  }

  async indexEntity(entity: any) {
    try {
      await this.client.index({
        id: entity.id,
        index: 'entities',
        body: {
          name: entity.name,
          nationalId: entity.nationalId,
          type: entity.type,
          status: entity.status,
          createdAt: entity.createdAt,
        },
        refresh: true,
      });
    } catch (err) {
      this.logger.error(`Failed to index entity ${entity.id}`, err);
    }
  }

  async search(index: string, query: string) {
    try {
      const result = await this.client.search({
        index,
        body: {
          query: {
            multi_match: {
              query,
              fields: ['name', 'nationalId', 'type', 'status'],
              fuzziness: 'AUTO',
            },
          },
        },
      });
      return result.body.hits.hits.map((h: any) => h._source);
    } catch (err) {
      this.logger.error(`Search failed for query: ${query}`, err);
      return [];
    }
  }
}
