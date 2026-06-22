---
mode: ask
description: "Generate a project-aligned STGP feature. Use when: creating NestJS endpoints, Prisma models/queries, Next.js App Router pages, RTL Arabic UI, DTO validation, and tests."
---

# STGP Feature Prompt

## Goal
Implement a production-ready feature for STGP with aligned backend, frontend, and docs impact.

## Context
- Stack: NestJS + TypeScript + Prisma + PostgreSQL (backend), Next.js App Router + TypeScript (frontend).
- Direction: Arabic RTL UI, Tajawal font style, strict DTO validation.
- Source of truth: Docs/README.md and domain docs under Docs/.
- Do not edit generated Prisma output under backend/generated/prisma/.
- Edit backend/prisma/schema.prisma if data model changes are needed.

## Inputs
- Feature name:
- Business outcome:
- Backend changes required:
- Frontend changes required:
- Data model changes required:
- Acceptance criteria:

## Required Output
1. Implementation plan (short).
2. Concrete file-level changes.
3. API contract details (request/response + validation).
4. Data model impact (if any).
5. Test plan (unit/e2e/frontend behavior).
6. Rollback/risk notes.

## Guardrails
- Prefer small, local edits.
- Preserve module boundaries in backend/src/app.module.ts and backend/src/identity/.
- Keep frontend changes under frontend/src/app/ consistent with App Router and RTL.
- Use clear naming and avoid placeholder boilerplate.
