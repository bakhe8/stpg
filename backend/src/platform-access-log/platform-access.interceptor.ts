import {
  BadRequestException,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PlatformAccessLogService } from './platform-access-log.service';
import { PlatformAccessType } from '@prisma/client';

@Injectable()
export class PlatformAccessInterceptor implements NestInterceptor {
  constructor(private readonly logService: PlatformAccessLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: { userType?: string; id?: string };
      params?: Record<string, string>;
      headers?: Record<string, string>;
      body?: { reason?: string };
      method?: string;
      path?: string;
    }>();

    const user = request.user;

    // يعمل فقط عندما Platform Operator يصل لـ entity محدد
    if (!user || user.userType !== 'platform') {
      return next.handle();
    }

    const entityId = request.params?.entityId || request.params?.id;
    if (!entityId) {
      return next.handle();
    }

    const reason =
      request.headers?.['x-access-reason'] ||
      request.body?.reason ||
      (request.path?.endsWith('/activate') ? 'إعادة تفعيل الكيان' : undefined);
    if (!reason?.trim()) {
      throw new BadRequestException(
        'يجب توثيق سبب وصول حساب المنصة إلى بيانات الكيان',
      );
    }

    const accessTypeHeader = request.headers?.['x-access-type'];
    const accessType: PlatformAccessType =
      accessTypeHeader === 'BREAK_GLASS'
        ? PlatformAccessType.BREAK_GLASS
        : accessTypeHeader === 'ADMIN_ACTION'
          ? PlatformAccessType.ADMIN_ACTION
          : accessTypeHeader === 'SUPPORT'
            ? PlatformAccessType.SUPPORT
            : PlatformAccessType.READ;

    let logId: string | undefined;

    return new Observable((subscriber) => {
      this.logService
        .create({
          platformAccountId: user.id!,
          entityId,
          accessType,
          dataScope: `${request.method} ${request.path}`,
          reason: reason.trim(),
        })
        .then((log) => {
          logId = log.id;
          next
            .handle()
            .pipe(
              finalize(() => {
                if (logId) {
                  void this.logService.closeSession(logId);
                }
              }),
            )
            .subscribe(subscriber);
        })
        .catch((err) => subscriber.error(err));
    });
  }
}
