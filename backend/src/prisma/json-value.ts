import { Prisma } from '@prisma/client';

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  return parsed as Prisma.InputJsonValue;
}
