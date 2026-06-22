import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // { id, email, name, role, userType: 'platform' }
  },
);
