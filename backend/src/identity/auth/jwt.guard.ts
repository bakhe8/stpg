import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_PLATFORM_KEY } from './decorators/allow-platform.decorator';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: import('@nestjs/common').ExecutionContext,
    status?: unknown,
  ): TUser {
    const authenticated = super.handleRequest(
      err,
      user,
      info,
      context,
      status,
    ) as TUser;
    const allowPlatform = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PLATFORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    const typedUser = authenticated as { userType?: string } | null;
    if (typedUser?.userType === 'platform' && !allowPlatform) {
      throw new ForbiddenException(
        'حسابات المنصة لا تستخدم واجهات أعضاء الكيانات',
      );
    }
    return authenticated;
  }
}
