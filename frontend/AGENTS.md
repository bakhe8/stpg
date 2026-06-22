# Frontend Instructions

Work in [frontend/](frontend/) for Next.js pages, layouts, styles, and UI behavior. Use [frontend/README.md](frontend/README.md) for local commands and setup details.

## Key files

- **App Router:** [frontend/src/app/](frontend/src/app/) — 22 pages under `(main)/` group + `login/`
- **Root layout:** [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) — RTL Arabic, Tajawal font, global styles
- **Entry redirect:** [frontend/src/app/page.tsx](frontend/src/app/page.tsx) — redirects `/` to `/login`
- **API client:** [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — Axios instance with 401 retry + token refresh
- **API modules:** [frontend/src/lib/api/](frontend/src/lib/api/) — per-domain fetch helpers (entities, wallets, subscriptions, …)
- **Route guard:** [frontend/src/proxy.ts](frontend/src/proxy.ts) — middleware protecting `/` routes

## Rules

- Interactive pages (state, events, localStorage) use `"use client"` at the top — this is standard and expected for most pages in this app
- Every page has its own CSS Module (e.g. `page.module.css`) — no Tailwind, no inline styles for layout
- All API calls go through `frontend/src/lib/api/` helpers, not raw `fetch` in components
- The 401 interceptor in `api.ts` auto-refreshes the token — don't add custom refresh logic in pages
- `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` shows the dev login bypass — set to `false` for production builds
- Keep RTL direction and Tajawal font consistent across all new pages

## Auth flow

1. `/login` — phone number input → `POST /auth/send-otp`
2. `/login` — OTP input → `POST /auth/verify-otp` → stores `accessToken`, `refreshToken`, `personId` in localStorage → redirect `/dashboard`
3. On 401: interceptor calls `POST /auth/refresh` → retries request → on failure: clears localStorage + redirect `/login`

## Verification

```bash
npm run build    # must produce 22 routes with no TypeScript errors
npm run lint
```
