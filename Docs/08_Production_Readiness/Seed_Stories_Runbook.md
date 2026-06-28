# Seed Stories Runbook

The seed dataset is treated as operational product evidence, not random demo
rows. The canonical story contract lives in:

```text
backend/prisma/seed-stories.ts
```

`npm run seed:validate:docker` verifies that all story fingerprints still exist
in the Docker application database. If a story fingerprint disappears, the
validator fails with `SEED_STORY_COVERAGE_MISSING`.

## Story Contract

| Story                      | Purpose                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S-01 صندوق عائلة بسيط      | Founder, treasurer, member arrears, payments, and a normal family emergency wallet.                                             |
| S-02 صندوق عائلة معقد      | Committees, auditor, several wallets, conditional/suspended/exited/supporter subscriptions, disputes, and mixed payment states. |
| S-03 عمارة shared benefit  | Shared building service, elevator/maintenance, non-payers, and vendor dispute.                                                  |
| S-04 حي قيد المراجعة       | Neighborhood entity with `PENDING_REVIEW` platform status.                                                                      |
| S-05 حملة علاج مؤقتة       | Medical campaign in `READ_ONLY`, donor-only support, appeal, and legal hold.                                                    |
| S-06 قبيلة وصندوق واسع     | Tribe relief, legacy reserve, donation path, and broad governance setup.                                                        |
| S-07 كيان تأسيسي شبه فارغ  | Pre-launch entities and inactive zero-balance wallets for empty-state coverage.                                                 |
| S-08 تعدد الكيانات         | Users who belong to several entities with different contexts.                                                                   |
| S-09 محفظة متعددة المسارات | One fund area with board, committee, public vote, cap, emergency, and donor-only paths.                                         |
| S-10 نزاع كامل timeline    | Appeal/dispute lifecycle with policy versions, documents, and audit trail context.                                              |
| S-11 عضو مشروط             | Conditional member with limited rights and pending request context.                                                             |
| S-12 داعم فقط              | Donor/supporter-only participation without benefit rights.                                                                      |
| S-13 عضو موقوف أو خرج      | Suspended and exited memberships with arrears and dispute evidence.                                                             |
| S-14 علاقات كيانات ومحافظ  | Entity and wallet relationships, support, shared/report-only states, and transfers.                                             |

## Updating The Seed

When adding, removing, or renaming seed data:

1. Update `backend/prisma/seed.ts`.
2. Update the matching story fingerprints in `backend/prisma/seed-stories.ts`.
3. Run:

```bash
cd backend
npm run seed:reset:docker
npm run seed:validate:docker
```

4. Run the role UX audit if accounts, roles, entities, or platform statuses
   changed:

```bash
cd frontend
npm run test:ux:roles
```

Do not lower story coverage to make validation pass. If a story is intentionally
removed, document the replacement story in this file and in
`DEEP_PRODUCT_OPERABILITY_EXECUTION_PLAN.md`.
