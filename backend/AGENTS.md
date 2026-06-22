# Backend Instructions

Work in [backend/](backend/) for NestJS, Prisma, authentication, and API changes. Use [backend/README.md](backend/README.md) for routine commands and setup details.

## Key files

- **Schema:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma) — source of truth; never edit `generated/prisma/`
- **Entry:** [backend/src/main.ts](backend/src/main.ts) — global validation pipe (`whitelist`, `forbidNonWhitelisted`, `transform`) + CORS
- **Module root:** [backend/src/app.module.ts](backend/src/app.module.ts) — 23 registered modules
- **Auth:** [backend/src/identity/](backend/src/identity/) — OTP (send-otp + verify-otp) + JWT + devLogin
- **Privacy:** [backend/src/common/privacy.helper.ts](backend/src/common/privacy.helper.ts) — `canView`, `assertCanView`, `TransparencyLevel`
- **Ledger:** [backend/src/ledger/ledger.service.ts](backend/src/ledger/ledger.service.ts) — all financial operations; never bypass it

## Rules

- All financial operations must go through `LedgerService` — never write to `LedgerTransaction` or `LedgerEntry` directly
- All writes need an `auditLog.create` entry in the same `$transaction`
- DTO validation is enforced globally — add class-validator decorators to every DTO
- For scheduled jobs use `@Cron` from `@nestjs/schedule` — `ScheduleModule` is already registered
- `ENABLE_QUEUES=true` enables BullMQ jobs — queue logic is optional and guarded by this flag

## Verification

```bash
npm run build       # must pass before any PR
npm run test        # 15 unit spec files
npm run test:e2e    # 1 e2e file
npm run lint
npx prisma migrate status
```
