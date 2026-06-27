import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Person } from '@prisma/client';

export type AuthUser =
  | (Person & { userType: 'tenant' })
  | {
      id: string;
      email: string;
      name: string;
      role: string;
      userType: 'platform';
      isActive: boolean;
    };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
