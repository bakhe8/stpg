import { SetMetadata } from '@nestjs/common';

export const ALLOW_PLATFORM_KEY = 'allowPlatformUser';
export const AllowPlatform = () => SetMetadata(ALLOW_PLATFORM_KEY, true);
