export type UserType = 'tenant' | 'platform';

export interface JwtPayload {
  sub: string;        // personId (tenant) أو platformAccountId (platform)
  username: string;   // username (tenant) أو email (platform)
  userType: UserType;
  iat?: number;
  exp?: number;
}
