const DEVELOPMENT_ACCESS_SECRET = 'super-secret-key-for-dev';

export function getAccessTokenSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return DEVELOPMENT_ACCESS_SECRET;
}

export function getRefreshTokenSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be configured in production');
  }

  return `${getAccessTokenSecret()}-refresh`;
}
