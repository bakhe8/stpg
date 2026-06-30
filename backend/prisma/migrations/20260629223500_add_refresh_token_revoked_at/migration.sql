-- Track the exact time a refresh token is rotated or revoked.
ALTER TABLE "refresh_tokens" ADD COLUMN "revokedAt" TIMESTAMP(3);
