import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type PlatformRequest = {
  user?: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    userType: 'platform';
  };
};

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<PlatformRequest>();
    return request.user;
  },
);
