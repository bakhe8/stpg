import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { TenantContextService } from '../core/tenant-context/tenant-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public readonly extended: ReturnType<typeof this.createExtension>;

  constructor(private readonly tenantContext: TenantContextService) {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    this.extended = this.createExtension();

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target.extended) {
          return target.extended[prop as keyof typeof target.extended];
        }
        return target[prop as keyof typeof target];
      },
    });
  }

  private createExtension() {
    return this.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ args, query }) => {
            const entityId = this.tenantContext.entityId ?? '';
            const personId = this.tenantContext.personId ?? '';
            const platformAccountId =
              this.tenantContext.platformAccountId ?? '';
            const internalAccess = this.tenantContext.internalAccess
              ? 'true'
              : '';
            if (
              !entityId &&
              !personId &&
              !platformAccountId &&
              !internalAccess
            ) {
              return query(args);
            }

            // Execute the operation within an array transaction.
            // This guarantees the SET LOCAL and the actual query run on the exact same pooled connection.
            const [, result] = await this.$transaction([
              this.$executeRaw`
                SELECT
                  set_config('app.current_entity_id', ${entityId}, true),
                  set_config('app.current_person_id', ${personId}, true),
                  set_config('app.current_platform_account_id', ${platformAccountId}, true),
                  set_config('app.internal_access', ${internalAccess}, true)
              `,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
