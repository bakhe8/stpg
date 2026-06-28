import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { IdentityModule } from './identity/identity.module';
import { EntitiesModule } from './entities/entities.module';
import { MembershipsModule } from './memberships/memberships.module';
import { WalletsModule } from './wallets/wallets.module';
import { GovernancePathsModule } from './governance-paths/governance-paths.module';
import { SpendingItemsModule } from './spending-items/spending-items.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { LedgerModule } from './ledger/ledger.module';
import { DecisionsModule } from './decisions/decisions.module';
import { AppealsModule } from './appeals/appeals.module';
import { EntityRelationshipsModule } from './entity-relationships/entity-relationships.module';
import { WalletRelationshipsModule } from './wallet-relationships/wallet-relationships.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DisputesModule } from './disputes/disputes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { RulesModule } from './rules/rules.module';
import { DisbursementRequestsModule } from './disbursement-requests/disbursement-requests.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { CommitteesModule } from './committees/committees.module';
import { HouseholdsModule } from './households/households.module';
import { BalanceTransferRequestsModule } from './balance-transfer-requests/balance-transfer-requests.module';
import { AuditorModule } from './auditor/auditor.module';
import { InvitationsModule } from './invitations/invitations.module';
import { MembershipApplicationsModule } from './membership-applications/membership-applications.module';
import { PlatformAuthModule } from './platform-auth/platform-auth.module';
import { PlatformEntitiesModule } from './platform-entities/platform-entities.module';
import { PlatformAccessLogModule } from './platform-access-log/platform-access-log.module';
import { SuspendedEntityGuard } from './common/guards/suspended-entity.guard';
import { PlatformAccessInterceptor } from './platform-access-log/platform-access.interceptor';
import { TenantContextModule } from './core/tenant-context/tenant-context.module';
import { TenantContextInterceptor } from './core/tenant-context/tenant-context.interceptor';
import { PaymentsModule } from './payments/payments.module';
import { SearchModule } from './search/search.module';
import { TemporalModule } from './temporal/temporal.module';
import { SupportModule } from './support/support.module';

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const throttleTtlMs = parsePositiveInt(process.env.THROTTLE_TTL_MS, 60000);
const throttleLimit = parsePositiveInt(
  process.env.THROTTLE_LIMIT,
  process.env.NODE_ENV === 'test' ? 1000 : 100,
);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: throttleTtlMs, limit: throttleLimit }]),
    ...(process.env.ENABLE_QUEUES === 'true' ? [QueueModule] : []),
    PrismaModule,
    IdentityModule,
    EntitiesModule,
    MembershipsModule,
    WalletsModule,
    GovernancePathsModule,
    SpendingItemsModule,
    SubscriptionsModule,
    LedgerModule,
    DecisionsModule,
    AppealsModule,
    EntityRelationshipsModule,
    WalletRelationshipsModule,
    AnalyticsModule,
    DisputesModule,
    NotificationsModule,
    DocumentsModule,
    RulesModule,
    DisbursementRequestsModule,
    BeneficiariesModule,
    CommitteesModule,
    HouseholdsModule,
    BalanceTransferRequestsModule,
    AuditorModule,
    InvitationsModule,
    MembershipApplicationsModule,
    PlatformAuthModule,
    PlatformEntitiesModule,
    PlatformAccessLogModule,
    TenantContextModule,
    PaymentsModule,
    SearchModule,
    TemporalModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SuspendedEntityGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PlatformAccessInterceptor },
  ],
})
export class AppModule {}
