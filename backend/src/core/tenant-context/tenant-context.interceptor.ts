import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RequestWithTenantHints {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  originalUrl?: string;
  user?: {
    id?: string;
    userType?: 'tenant' | 'platform';
  };
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithTenantHints>();
    const entityId = this.extractEntityId(request);
    const personId =
      request.user?.userType === 'tenant' ? request.user.id : undefined;
    const platformAccountId =
      request.user?.userType === 'platform' ? request.user.id : undefined;

    if (entityId && !UUID_RE.test(entityId)) {
      throw new BadRequestException('معرّف الكيان غير صالح');
    }

    if (entityId && !request.user) {
      throw new UnauthorizedException('يلزم تسجيل الدخول لاختيار سياق كيان');
    }

    return this.tenantContext.run(
      { entityId, personId, platformAccountId },
      async () => {
        if (entityId && request.user?.userType === 'tenant') {
          if (
            !personId ||
            !(await this.hasActiveMembership(entityId, personId))
          ) {
            throw new ForbiddenException('غير مصرح باستخدام سياق هذا الكيان');
          }
        }
        return next.handle();
      },
    );
  }

  private extractEntityId(request: RequestWithTenantHints): string | undefined {
    if (this.isTopLevelEntityCreate(request)) {
      return undefined;
    }

    const headerValue = this.firstString(request.headers['x-entity-id']);
    const queryValue = this.firstString(request.query?.entityId);
    const paramValue = this.firstString(request.params?.entityId);
    const entityRouteValue = this.entityRouteId(request);
    return (
      (headerValue ?? queryValue ?? paramValue ?? entityRouteValue)?.trim() ||
      undefined
    );
  }

  private firstString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  }

  private isTopLevelEntityCreate(request: RequestWithTenantHints) {
    if (request.method !== 'POST') return false;
    const segments = this.routeSegments(request);
    return segments.length === 1 && segments[0] === 'entities';
  }

  private entityRouteId(request: RequestWithTenantHints): string | undefined {
    const id = request.params?.id;
    if (!id) return undefined;

    const segments = this.routeSegments(request);
    if (segments?.[0] !== 'entities') return undefined;
    if (
      request.method === 'POST' &&
      (segments[2] === 'join' || segments[2] === 'memberships')
    ) {
      return undefined;
    }

    return id;
  }

  private routeSegments(request: RequestWithTenantHints) {
    const segments =
      request.originalUrl?.split('?')[0].split('/').filter(Boolean) ?? [];
    return segments[0] === 'api' ? segments.slice(1) : segments;
  }

  private async hasActiveMembership(
    entityId: string,
    personId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
      select: { id: true },
    });
    return Boolean(membership);
  }
}
