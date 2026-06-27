import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';

type GuardRequest = {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  method?: string;
  originalUrl?: string;
};

@Injectable()
export class SuspendedEntityGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.tenantContext.runInternal(async () => {
      const request = context.switchToHttp().getRequest<GuardRequest>();
      if (request.originalUrl?.startsWith('/platform/')) return true;
      // تصدير البيانات مضمون حتى حال التعليق (حق لا يُسلب)
      if (request.originalUrl?.split('?')[0].endsWith('/export')) return true;
      // الاعتراض على التعليق يجب أن يُقبل دائماً
      if (request.originalUrl?.includes('/platform-appeal')) return true;

      const entityId = await this.resolveEntityId(request);
      if (!entityId) return true;

      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { platformStatus: true, suspendedReason: true },
      });

      if (!entity) return true;

      if (entity.platformStatus === 'SUSPENDED') {
        throw new ForbiddenException({
          message: 'هذا الكيان معلّق مؤقتاً من قِبَل فريق المنصة',
          reason: entity.suspendedReason,
          code: 'ENTITY_SUSPENDED',
        });
      }

      if (entity.platformStatus === 'READ_ONLY' && request.method !== 'GET') {
        throw new ForbiddenException({
          message: 'هذا الكيان في وضع القراءة فقط مؤقتاً',
          code: 'ENTITY_READ_ONLY',
        });
      }

      return true;
    });
  }

  private async resolveEntityId(request: GuardRequest): Promise<string | null> {
    const params = request.params ?? {};
    const body = request.body ?? {};

    if (params.entityId) return params.entityId;
    if (typeof body.entityId === 'string') return body.entityId;

    if (params.walletId) return this.entityFromWallet(params.walletId);
    if (typeof body.walletId === 'string') {
      return this.entityFromWallet(body.walletId);
    }

    const pathId =
      params.pathId ??
      (typeof body.pathId === 'string' ? body.pathId : undefined) ??
      (typeof body.governancePathId === 'string'
        ? body.governancePathId
        : undefined);
    if (pathId) return this.entityFromPath(pathId);

    const membershipId =
      params.membershipId ??
      (typeof body.membershipId === 'string' ? body.membershipId : undefined);
    if (membershipId) return this.entityFromMembership(membershipId);

    const id = params.id;
    if (!id) return null;

    const path = request.originalUrl?.split('?')[0] ?? '';
    if (path.includes('/payment-records/')) {
      const record = await this.prisma.paymentRecord.findUnique({
        where: { id },
        select: {
          subscription: {
            select: { membership: { select: { entityId: true } } },
          },
        },
      });
      return record?.subscription.membership.entityId ?? null;
    }

    const resource = path.split('/').filter(Boolean)[0];
    switch (resource) {
      case 'entities':
        return id;
      case 'wallets':
        return this.entityFromWallet(id);
      case 'paths':
        return this.entityFromPath(id);
      case 'memberships':
        return this.entityFromMembership(id);
      case 'subscriptions': {
        const record = await this.prisma.subscription.findUnique({
          where: { id },
          select: { membership: { select: { entityId: true } } },
        });
        return record?.membership.entityId ?? null;
      }
      case 'decisions': {
        const record = await this.prisma.decision.findUnique({
          where: { id },
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        });
        return record?.governancePath?.wallet.entityId ?? null;
      }
      case 'appeals': {
        const record = await this.prisma.appeal.findUnique({
          where: { id },
          select: {
            decision: {
              select: {
                governancePath: {
                  select: { wallet: { select: { entityId: true } } },
                },
              },
            },
          },
        });
        return record?.decision.governancePath?.wallet.entityId ?? null;
      }
      case 'disputes': {
        const record = await this.prisma.dispute.findUnique({
          where: { id },
          select: { entityId: true },
        });
        return record?.entityId ?? null;
      }
      case 'disbursement-requests': {
        const record = await this.prisma.disbursementRequest.findUnique({
          where: { id },
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        });
        return record?.governancePath.wallet.entityId ?? null;
      }
      case 'balance-transfer-requests': {
        const record = await this.prisma.balanceTransferRequest.findUnique({
          where: { id },
          select: {
            fromPath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        });
        return record?.fromPath.wallet.entityId ?? null;
      }
      case 'spending-items': {
        const record = await this.prisma.spendingItem.findUnique({
          where: { id },
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        });
        return record?.governancePath.wallet.entityId ?? null;
      }
      case 'committees': {
        const record = await this.prisma.committee.findUnique({
          where: { id },
          select: { entityId: true },
        });
        return record?.entityId ?? null;
      }
      case 'households': {
        const record = await this.prisma.household.findUnique({
          where: { id },
          select: { entityId: true },
        });
        return record?.entityId ?? null;
      }
      case 'beneficiaries': {
        const record = await this.prisma.beneficiary.findUnique({
          where: { id },
          select: { entityId: true },
        });
        return record?.entityId ?? null;
      }
      case 'documents': {
        const record = await this.prisma.document.findUnique({
          where: { id },
          select: {
            entityId: true,
            wallet: { select: { entityId: true } },
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
            dispute: { select: { entityId: true } },
          },
        });
        return (
          record?.entityId ??
          record?.wallet?.entityId ??
          record?.governancePath?.wallet.entityId ??
          record?.dispute?.entityId ??
          null
        );
      }
      case 'membership-applications': {
        const record = await this.prisma.membershipApplication.findUnique({
          where: { id },
          select: { entityId: true },
        });
        return record?.entityId ?? null;
      }
      case 'entity-relationships': {
        const record = await this.prisma.entityRelationship.findUnique({
          where: { id },
          select: { sourceEntityId: true },
        });
        return record?.sourceEntityId ?? null;
      }
      case 'wallet-relationships': {
        const record = await this.prisma.walletRelationship.findUnique({
          where: { id },
          select: { sourceWallet: { select: { entityId: true } } },
        });
        return record?.sourceWallet.entityId ?? null;
      }
      default:
        return null;
    }
  }

  private async entityFromWallet(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { entityId: true },
    });
    return wallet?.entityId ?? null;
  }

  private async entityFromPath(pathId: string) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      select: { wallet: { select: { entityId: true } } },
    });
    return path?.wallet.entityId ?? null;
  }

  private async entityFromMembership(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: { entityId: true },
    });
    return membership?.entityId ?? null;
  }
}
