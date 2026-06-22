import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'platform') {
      throw new ForbiddenException('هذا الـ endpoint مخصص لفريق المنصة فقط');
    }

    return true;
  }
}
