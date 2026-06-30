import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** ضع هذا الـ decorator على أي endpoint لا يتطلب JWT */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
