# STGP Workspace Notes

This workspace is split into a NestJS backend in [backend/](backend/) and a Next.js frontend in [frontend/](frontend/). Use the docs as the source of truth for domain and architecture details: [Docs/README.md](Docs/README.md), [backend/README.md](backend/README.md), and [frontend/README.md](frontend/README.md).

Run commands from the relevant app directory, not from the workspace root. The backend uses `npm run build`, `npm run test`, `npm run test:e2e`, and `npm run lint`; the frontend uses `npm run dev`, `npm run build`, `npm run start`, and `npm run lint`.

Keep backend changes aligned with NestJS conventions, the global validation pipe in [backend/src/main.ts](backend/src/main.ts), and the module split rooted at [backend/src/app.module.ts](backend/src/app.module.ts). Treat [backend/generated/prisma/](backend/generated/prisma/) as generated output and edit [backend/prisma/schema.prisma](backend/prisma/schema.prisma) instead.

Keep frontend changes consistent with the App Router in [frontend/src/app/](frontend/src/app/), the RTL Arabic layout in [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx), and the API client layer in [frontend/src/lib/api/](frontend/src/lib/api/). Interactive pages use `"use client"` and CSS Modules — this is expected and intentional.

Prefer small, local edits and validate with the narrowest useful command for the area you touched.

## Current build state (21 June 2026)

- Backend: 23 modules, TypeScript clean, 13 migrations applied
- Frontend: 22 pages, TypeScript clean, OTP two-step login active
- Auth: full OTP flow (send-otp → verify-otp) + devLogin behind `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true`
- Token refresh: automatic retry on 401 via Axios interceptor in `frontend/src/lib/api.ts`
- Privacy: `canView` / `assertCanView` in `backend/src/common/privacy.helper.ts`

## What's left to build

See [REMAINING_WORK.md](./REMAINING_WORK.md) — 7 items, all non-breaking unless they touch the Ledger schema.
