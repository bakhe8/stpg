import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { PrismaService } from '../prisma/prisma.service';

type SearchableEntity = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  platformStatus?: string | null;
  createdAt: Date | string;
};

type SearchHit<TDocument extends Record<string, unknown>> = {
  _id?: string;
  _source?: TDocument;
};

type EntitySearchDocument = {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  createdAt: Date | string;
};

@Injectable()
export class SearchService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {
    this.client = new Client({
      node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
    });
  }

  async onModuleInit() {
    try {
      const info = await this.client.info();
      const infoBody: { version?: { number?: string } } = info.body;
      this.logger.log(
        `Connected to OpenSearch: ${infoBody.version?.number ?? 'unknown'}`,
      );
      await this.initIndices();
    } catch {
      this.logger.warn(
        'OpenSearch connection failed. Please ensure OpenSearch is running.',
      );
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

  async indexEntity(entity: SearchableEntity) {
    try {
      await this.client.index({
        id: entity.id,
        index: 'entities',
        body: {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          status: entity.platformStatus ?? entity.status,
          createdAt: entity.createdAt,
        },
        refresh: true,
      });
    } catch (err) {
      this.logger.error(`Failed to index entity ${entity.id}`, err);
    }
  }

  async search(
    index: string,
    query: string,
  ): Promise<Record<string, unknown>[]> {
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
      const body: unknown = result.body;
      return this.extractHits<Record<string, unknown>>(body)
        .map((hit) => hit._source)
        .filter((source): source is Record<string, unknown> => !!source);
    } catch (err) {
      this.logger.error(`Search failed for query: ${query}`, err);
      return [];
    }
  }

  async searchEntities(query: string, personId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { personId, isActive: true },
      select: { entityId: true },
    });
    const allowedEntityIds = memberships.map(
      (membership) => membership.entityId,
    );
    if (allowedEntityIds.length === 0) return [];

    try {
      const result = await this.client.search({
        index: 'entities',
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['name', 'type', 'status'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
              filter: [{ terms: { _id: allowedEntityIds } }],
            },
          },
        },
      });

      const body: unknown = result.body;
      const entities = this.extractHits<EntitySearchDocument>(body).map((hit) => ({
        id: hit._id,
        ...hit._source,
      }));
      if (entities.length > 0) return entities;

      return this.searchEntitiesFromDatabase(query, allowedEntityIds);
    } catch (err) {
      this.logger.error(`Entity search failed for query: ${query}`, err);
      return this.searchEntitiesFromDatabase(query, allowedEntityIds);
    }
  }

  private async searchEntitiesFromDatabase(query: string, entityIds: string[]) {
    const entities = await this.prisma.entity.findMany({
      where: {
        id: { in: entityIds },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        platformStatus: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      status: entity.platformStatus,
      createdAt: entity.createdAt,
    }));
  }

  private extractHits<TDocument extends Record<string, unknown>>(
    body: unknown,
  ): SearchHit<TDocument>[] {
    const response = body as { hits?: { hits?: SearchHit<TDocument>[] } };
    return Array.isArray(response.hits?.hits) ? response.hits.hits : [];
  }
}
