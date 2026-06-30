# 01 - Fund Experience Transition Plan

## Document Status

This is the main plan for `Docs/09_Improvement`.

Read it with:

- `../REPOSITORY_STATE.md` for the current repository baseline.
- `00_README.md` for the current folder order and post-08 status.
- `02_CAPABILITY_PRESERVATION_AUDIT.md` for the capabilities that must remain available.
- `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md` for the detailed gaps.
- `04_PHASE_A_PREFLIGHT_BACKLOG.md`, `05_PHASE_B_TEMPLATE_NORMALIZATION.md`, and `06_PHASE_C_PROFILE_AND_ADVANCED_SETTINGS.md` for the executed preflight packages.

Current execution assumption:

- Production readiness backlog 08 is treated as closed based on the updated `Docs/08_Production_Readiness/BACKLOG.md`.
- The current operational repository state is `2.2`, documented in `Docs/REPOSITORY_STATE.md`.
- `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` is historical when it conflicts with the updated backlog.
- Phase A/B/C are complete. The next implementation step is Phase D: a new fund/campaign creation path behind a feature flag, not replacing the legacy flow yet.

## Purpose

This document captures the product and engineering plan for simplifying the user-facing creation and management experience without weakening the current CollectiveTrustOS operating model.

The main decision is:

> Users should work with **funds** and **campaigns**, while the backend may continue to use the existing `Entity`, `Wallet`, `GovernancePath`, `Policy`, `Rules`, and related models.

This is a product-experience transition, not a rewrite. The system already has useful depth. The goal is to make that depth accessible through a simpler entry point, not to remove it.

## Current Problem

The current system exposes the word "entity" and asks users to choose between social classifications such as family, tribe, building, or neighborhood. This creates several issues:

- "Entity" is a backend/domain modeling term. It is not meaningful to most users.
- Social classification is not always the right first question. A fund may be used by a family, building, neighborhood, friends, coworkers, or any custom group.
- The operational behavior of a fund should come from its policies, wallets, governance paths, rules, and templates, not from a hard-coded social category.
- Asking too much during creation can force users into concepts they do not yet understand.
- Some current frontend choices already drift from backend constraints, such as frontend-only options or fields not accepted by the create DTO.

## Product Direction

### User-Facing Terms

Use these user-facing terms:

| User-facing term | Internal/backend term |
|---|---|
| Fund / صندوق | Entity |
| Campaign / حملة | Campaign entity with `isCampaign = true` |
| Wallet / محفظة | Wallet |
| Subscription / اشتراك | Subscription |
| Decision / قرار | Decision |
| Vote / تصويت | Vote |
| Committee / لجنة | Committee |
| Advanced settings / إعدادات متقدمة | Policies, rules, permissions, paths |

The word "entity" should not appear in normal user-facing UI. It may remain in backend code, developer documentation, API internals, and admin-only technical surfaces where needed.

### Funds and Campaigns

The user should see two top-level creation choices:

1. Create fund / إنشاء صندوق
2. Create campaign / إنشاء حملة

Funds are ongoing operating units. Campaigns are temporary and may have an end date, automatic archiving, read-only state, campaign notifications, and a different lifecycle. Campaigns should remain visibly separate from funds.

### Fund Naming

The visible base concept is always "fund". Users may name or describe it as:

- صندوق عائلة
- صندوق عمارة
- صندوق حي
- صندوق زملاء
- صندوق خدمات
- Any custom name

The product should not force family/building/neighborhood/tribe as the main creation decision. Those may exist as optional profile labels, descriptions, or onboarding hints.

## Guiding Principles

1. **Do not remove capability.**
   The new experience may simplify the start, but every current advanced capability must remain reachable after creation.

2. **Templates are starting points, not cages.**
   A fund created from any template can later add wallets, paths, committees, rules, beneficiaries, relationships, and advanced policies.

3. **Behavior comes from operating settings.**
   Fund behavior should be driven by policy, wallet benefit type, governance path, rule templates, membership settings, and representation settings.

4. **Social profile is optional.**
   Family/building/neighborhood/tribe may help the user describe the fund, but it should not be the main source of behavior.

5. **Campaigns stay distinct.**
   A campaign is not just a renamed fund. It has lifecycle behavior that should remain explicit.

6. **Keep the old path until the new path proves parity.**
   Existing creation and management flows should remain available behind a legacy/admin/internal route or feature flag until the new flow passes capability checks.

7. **Advanced control is delegated by permission, not by role confusion.**
   The founder always has advanced settings access, but may delegate it to another member/manager without also granting money custody or spending approval.

## Proposed Creation Experience

### Step 1: Choose Creation Type

The first screen should show:

- Create fund / إنشاء صندوق
- Create campaign / إنشاء حملة

### Step 2A: Fund Creation

The fund creation wizard should be short by default:

1. Fund name
2. Optional description
3. Template selection
4. Optional profile label
5. Review and create

Advanced settings should be either hidden under an advanced disclosure or deferred until after creation.

### Step 2B: Campaign Creation

Campaign creation should ask for:

1. Campaign name
2. Optional description
3. Optional end date
4. Campaign purpose/category if useful
5. Review and create

Examples:

- حملة دية
- حملة تفريج كربة
- حملة علاج
- حملة مساعدة عاجلة

## Initial Fund Templates

The first set of fund templates should cover core operating patterns without over-classifying the user socially.

### 1. Custom Fund / صندوق مخصص

Purpose:

Flexible default fund for users who want a normal starting point without choosing a strict model.

Suggested initial setup:

- One main wallet
- Founder membership
- Default member approval enabled
- Standard decisions enabled
- Basic subscription/payment flow optional
- Appeals enabled
- Auditor module available but not forced

### 2. Mutual Aid Fund / صندوق تكافل

Purpose:

Support cases, aid, medical/social assistance, family support, emergency help.

Suggested initial setup:

- One aid wallet
- Beneficiaries enabled
- Documents enabled
- Higher privacy defaults for beneficiary data
- Spending decisions through committee or board by default
- Appeals and disputes enabled
- Optional attachments required for disbursement decisions

### 3. Shared Services Fund / صندوق خدمات مشتركة

Purpose:

Building, neighborhood, residential complex, shared guard/elevator/maintenance/service costs, or any shared-benefit group.

Suggested initial setup:

- One shared-services wallet
- `Wallet.benefitType = SHARED`
- Subscription/payment dues enabled
- Visibility for shared coverage, free-riders, deficit, overdue dues
- Public vote or committee governance
- Vendor/service spending items enabled

Important:

This should not be hard-coded as `EntityType.BUILDING`. A building is one possible profile. The behavior should come from shared benefit settings.

### 4. Start Empty / ابدأ فارغا

Purpose:

A minimal shell for users who do not want a preset.

Suggested initial setup:

- Fund record
- Founder membership
- Minimal policy defaults
- No forced extra wallet/path beyond what the system requires to remain operational

Important:

Starting empty must not mean limited. The user can later add all supported capabilities.

### 5. Campaign / حملة مؤقتة

Purpose:

Temporary collection or support effort with a defined end, goal, or closure lifecycle.

Suggested initial setup:

- Campaign entity with `isCampaign = true`
- Optional `campaignEndsAt`
- Parent fund where applicable
- Archive/read-only behavior remains available
- Campaign expiration notifications remain available

Campaign may appear as a separate top-level creation choice, not necessarily inside the fund template list.

## Explicit Non-Goals

These should not be done in the first implementation phase:

- Do not delete `Entity`.
- Do not delete `EntityType`.
- Do not migrate all existing records to a new structure immediately.
- Do not remove the existing creation screen before the new flow proves coverage.
- Do not remove advanced rules, governance paths, voting types, household voting, committees, auditing, relationships, or financial flows.
- Do not make social profile determine core operating behavior.

## Backend Strategy

### Keep Existing Core

The existing models remain the operating core:

- `Entity`
- `EntityPolicy`
- `Wallet`
- `WalletPolicy`
- `GovernancePath`
- `PathPolicy`
- `Rule`
- `Household`
- `Committee`
- `Membership`
- `Subscription`
- `Decision`
- `DisbursementRequest`
- `Appeal`
- `Dispute`
- `AuditLog`
- `EntityTemplate`

### Add a Setup Layer

Add a higher-level setup service rather than rewriting the entity service.

Possible service name:

- `FundSetupService`

Possible endpoint:

- `POST /funds`
- or `POST /entities/setup`

Input concept:

```json
{
  "kind": "FUND",
  "name": "صندوق خدمات العمارة",
  "description": "اختياري",
  "templateKey": "SHARED_SERVICES",
  "profileKey": "BUILDING",
  "advanced": {
    "membershipMode": "INVITE_ONLY",
    "governancePreset": "COMMITTEE"
  }
}
```

The setup service translates this into current internal records:

- `Entity`
- `EntityPolicy`
- initial `Wallet`
- initial `WalletPolicy`
- initial `GovernancePath`
- initial `PathPolicy`
- optional `Rules`
- optional enabled modules
- audit log

The current `EntitiesService.createEntity` can remain as the internal low-level creation mechanism or legacy route.

### Contract Cleanup

Current frontend/backend drift should be corrected during this work:

- If frontend sends `defaultGovernanceType`, backend must either accept it through a new setup contract or the frontend must stop sending it to the low-level entity endpoint.
- If frontend displays `FRIENDS`, backend must either support it as an optional profile label or the frontend must not send it as `EntityType`.
- User-facing creation should not expose raw `EntityType` enums.

## Database Strategy

### Phase 1: No Destructive Migration

Keep the current schema. Do not remove enum values or columns.

Use existing:

- `entities.type`
- `entities.templateId`
- `entities.enabledModules`
- `entity_templates.defaultPolicy`
- `entity_templates.defaultWallets`
- `entity_templates.defaultPaths`
- policies and rules

### Phase 2: Additive Metadata

If needed, add optional fields only:

- `profileKey String?`
- `setupVersion String?`
- `templateSnapshot Json?`
- `createdFromSetupFlow Boolean @default(false)`

These fields help product analytics, support, and migration without changing core behavior.

### Phase 3: Optional Legacy Cleanup

Only after the new flow is stable:

- Decide whether `EntityType` remains as internal legacy data.
- Decide whether social categories should be represented as optional profile labels.
- Do not remove until tests and seed stories prove full parity.

## Permissions and Advanced Settings

### Founder Access

The founder must always be able to access advanced settings.

### Delegated Advanced Settings

The founder may delegate advanced settings management to another member or manager.

This permission must be independent from:

- Holding money
- Approving disbursement
- Treasurer role
- Auditor role
- Committee membership
- Voting rights

Possible permission:

- `MANAGE_ADVANCED_SETTINGS`

This permission should allow changes to setup/policy/rules where appropriate, subject to audit logs and possibly governance approval depending on policy.

### Future Question

Some advanced changes may need governance approval rather than immediate effect. This should be decided per setting:

- Low-risk wording/profile changes may be immediate.
- Quorum, vote type, transfer rules, transparency, and appeal policy may need impact preview and/or decision approval.

## Capability Preservation Matrix

The new flow must preserve all existing capabilities. Every capability should remain reachable after creation, even if hidden from the first wizard.

| Capability | Must remain available? | Initial wizard? | Post-creation location | Notes |
|---|---:|---:|---|---|
| Multiple wallets | Yes | No | Fund wallets | Any fund can add wallets later. No need for a "multi-wallet fund" template. |
| Multiple governance paths | Yes | Optional/advanced | Wallet/path settings | Core depth must remain. |
| Board governance | Yes | Template-driven | Paths/settings | Available for any fund. |
| Committee governance | Yes | Template-driven | Committees/paths | Available for any fund. |
| Public vote | Yes | Template-driven | Paths/decisions | Available for any fund. |
| Individual decision with cap | Yes | Advanced/template | Path policy | Must remain for trusted small operations. |
| Donation-only path | Yes | Advanced/template | Paths/subscriptions | Important for supporters without benefit rights. |
| Emergency then review | Yes | Advanced/template | Path policy | Important for urgent cases. |
| One-member-one-vote | Yes | Advanced/template | Entity/path policy | Default for many funds. |
| One-family/household vote | Yes | Advanced | Households + vote policy | Should not be limited to "family" type only. |
| Household/member grouping | Yes | Advanced | Households/representation settings | Could later generalize to representation units. |
| Subscriptions | Yes | Template-driven | Subscriptions/finance | Needed for recurring funds. |
| Payment dues | Yes | Template-driven | Finance/subscriptions | Must remain. |
| Payment proof review | Yes | No | Finance/reviews | Treasurer/admin workflow remains. |
| Beneficiaries | Yes | Template-driven | Beneficiaries | Important for mutual aid. |
| Dependents | Yes | Advanced | Beneficiaries/dependents | Remains available. |
| Disbursement requests | Yes | No | Disbursement requests | Must remain. |
| Spending items | Yes | Advanced | Spending items/path | Must remain. |
| Decisions | Yes | No | Decisions | Core governance. |
| Appeals | Yes | Template-driven | Appeals/disputes | Should default on for many templates. |
| Disputes | Yes | Advanced/template | Disputes | Must remain. |
| Documents/attachments | Yes | Template-driven | Documents/requests | Privacy controls remain. |
| Auditor view | Yes | Advanced/template | Auditor | Important for trust. |
| Audit logs | Yes | No | Auditor/platform/admin | Must remain for every setup path. |
| Entity/fund relationships | Yes | Advanced | Relationships | Support/shared/report-only relationships remain. |
| Wallet relationships | Yes | Advanced | Wallet relationships | Must remain. |
| Support between funds | Yes | Advanced | Relationships/transfers | Must remain. |
| Balance transfers | Yes | Advanced | Wallet/path transfer flow | Requires decision and rules. |
| Closure/archive | Yes | Advanced/admin | Settings/platform | Must remain. |
| Platform suspension/read-only | Yes | No | Platform/admin | Must remain. |
| Campaign end/archive | Yes | Campaign creation | Campaign detail/settings | Campaign-specific lifecycle remains. |
| Notifications | Yes | No | Notifications settings | Must remain. |
| Search | Yes | No | Global search | Labels should say fund/campaign, not entity. |
| Rule templates | Yes | Advanced | Rules | Should be user-friendly, no raw JSON for normal users. |
| Custom rules | Yes | Advanced | Rules | Power feature remains. |
| Policy impact preview | Yes | Advanced | Settings/rules | Important before saving. |

## Impact by Layer

### Frontend

Expected changes:

- Replace normal user-facing "entity" wording with "fund".
- Add top-level fund/campaign creation choice.
- Add new fund creation wizard.
- Move social category selection to optional profile/description.
- Hide raw enums from normal users.
- Keep old screen available under legacy/internal route or feature flag.
- Make advanced settings progressive and permission-controlled.

Areas likely affected:

- Entities list
- Entity detail
- New entity wizard
- Join invitation preview
- Global search labels
- Dashboard context labels
- Platform dashboard labels
- Rules/settings pages
- Locales Arabic/English

### Backend

Expected changes:

- Add setup service/controller.
- Keep existing entity service.
- Add template resolution logic.
- Add audit logs for setup actions.
- Move behavior mapping away from social entity type where possible.
- Add permission for advanced settings delegation.

Areas likely affected:

- `entities`
- `entity-templates`
- `wallets`
- `governance-paths`
- `rules`
- `work-surface`
- `platform-surface`
- `invitations`
- `search`
- auth/permissions if advanced settings delegation is implemented

### Data Model

Expected changes:

- No destructive migration initially.
- Possible additive metadata fields later.
- Possible permission/role extension for advanced settings.
- Possible template metadata improvements.

### Seed and QA

Expected changes:

- Existing seed stories stay.
- Add setup-flow seeds/tests for each new template.
- Update role audit expectations only after new labels/routes are stable.
- Preserve old test coverage until equivalent new coverage exists.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Losing advanced capabilities | The current system depth is a product advantage. | Capability Preservation Matrix must pass before old flow is retired. |
| Breaking existing records | Existing data uses current enum/model structure. | No destructive migrations in early phases. |
| Overloading creation wizard | Simplification can fail if advanced choices move to step one. | Minimal wizard with deferred advanced settings. |
| Hiding too much | Power users may need immediate control. | Advanced disclosure and post-creation setup map. |
| Campaign/fund confusion | Campaigns have distinct lifecycle. | Separate create option and keep `isCampaign` behavior. |
| Social type still drives behavior | Hard-coded type checks can preserve old confusion. | Move behavior to template/policy/wallet settings. |
| Frontend/backend contract mismatch | Current drift can cause failed create requests. | New setup DTO and endpoint with tests. |
| Permissions become too broad | Delegating settings could accidentally grant financial power. | Separate advanced settings permission from treasurer/approver roles. |
| Templates become restrictive | Users may think a template locks them in. | UI copy and backend design must allow full later expansion. |
| Old and new flows diverge | Parallel flows can cause inconsistency. | Shared setup service or shared lower-level helpers; parity tests. |

## Verification Requirements

Before enabling the new flow broadly:

1. Create one fund from each template.
2. Confirm each created fund can add a new wallet.
3. Confirm each created fund can add or modify governance paths.
4. Confirm vote types remain available through advanced settings.
5. Confirm committee governance can be enabled.
6. Confirm public vote can be enabled.
7. Confirm one-household/representation voting remains available where configured.
8. Confirm subscriptions and payment due workflows work.
9. Confirm payment proof submission and review work.
10. Confirm beneficiaries and disbursement requests work.
11. Confirm decisions, appeals, disputes, and audit logs work.
12. Confirm documents and privacy settings work.
13. Confirm auditor view remains available when enabled.
14. Confirm fund relationships and wallet relationships still work.
15. Confirm campaign creation, expiration, archiving, and read-only display work.
16. Confirm old creation flow still works until officially retired.
17. Confirm no normal user UI exposes "entity" where "fund" should appear.
18. Confirm no template prevents later access to current capabilities.

## Phased Implementation Plan

### Phase 0: Documentation and Alignment

Deliverables:

- `00_README.md`.
- This document.
- `02_CAPABILITY_PRESERVATION_AUDIT.md`.
- `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md`.
- `04_PHASE_A_PREFLIGHT_BACKLOG.md`.
- Product decisions recorded.
- Capability matrix accepted as a guardrail.

Exit criteria:

- Team agrees this is an additive transition, not a rewrite.

Current status:

- Done for planning purposes.
- The remaining work is implementation and verification.

### Phase A: Post-08 Preflight Contract Cleanup

Deliverables:

- Align create entity payload between frontend and backend.
- Remove frontend-only `FRIENDS` as an `EntityType` value.
- Remove or properly map `defaultGovernanceType`.
- Align frontend `VoteType` and `TransparencyLevel` values with backend enums.
- Add an explicit default for `allowedGovernanceTypes`.
- Add a focused verification pack.

Exit criteria:

- `04_PHASE_A_PREFLIGHT_BACKLOG.md` is complete.
- The current legacy creation flow no longer sends fields or enum values rejected by the backend.
- No new user-facing fund wizard has been introduced yet.

### Phase 1: Language and Surface Cleanup

Deliverables:

- Replace normal user-facing "entity" wording with "fund".
- Keep backend names unchanged.
- Keep admin/developer references where needed.
- Update Arabic and English locale keys carefully.

Exit criteria:

- Existing flows still work.
- No behavior change.
- Screenshots/QA confirm wording.

### Phase 2: New Setup Contract

Deliverables:

- New setup DTO.
- New setup service/controller.
- Template key handling.
- Setup audit log.
- Tests for DTO validation and template mapping.

Exit criteria:

- New endpoint can create a fund without breaking old endpoint.

### Phase 3: Template Implementation

Deliverables:

- Template definitions for:
  - Custom fund
  - Mutual aid fund
  - Shared services fund
  - Start empty
  - Campaign
- Template mapping to policies, wallets, paths, modules, and optional rules.

Exit criteria:

- Each template creates valid operational data.
- Seed validation passes.

### Phase 4: New Wizard Behind Feature Flag

Deliverables:

- New creation UI.
- Top-level create fund/create campaign choice.
- Optional social profile field.
- Minimal default flow.
- Advanced optional section or post-create setup map.

Exit criteria:

- New wizard creates working records through new setup endpoint.
- Old wizard remains available.

### Phase 5: Capability Parity QA

Deliverables:

- Capability Preservation Matrix verification.
- Automated tests for core capabilities.
- UX role audit update only when stable.

Exit criteria:

- Every capability in the matrix remains reachable after creating funds from the new templates.

### Phase 6: Move Hard-Coded Behavior to Settings

Deliverables:

- Replace `EntityType.BUILDING` style behavior checks with operational settings.
- Use wallet benefit type, template metadata, policy, or profile labels.
- Keep compatibility fallback while data is migrated.

Exit criteria:

- Shared-benefit behavior does not depend on a social entity type.

### Phase 7: Legacy Route Decision

Deliverables:

- Decide whether old creation UI remains internal/admin only.
- Decide whether to keep `EntityType` as legacy/internal.
- Document any migration decision.

Exit criteria:

- No old capability is lost.
- New flow is the default for normal users.

## Open Decisions

These decisions are known and should be revisited during backlog planning. They do not block Phase A, but they must be resolved before the phase that depends on them:

1. Exact Arabic labels for the first template set.
2. Whether campaign creation is top-level only or also available from inside a fund.
3. Whether optional social profile values are free text, controlled list, or both.
4. Whether advanced settings changes require governance approval in some cases.
5. Exact permission model for `MANAGE_ADVANCED_SETTINGS`.
6. Whether `profileKey` and `templateSnapshot` are needed in the first migration or later.
7. Which existing screen becomes the legacy/internal setup surface.

## Product Decisions Already Made

- Use "fund / صندوق" instead of "entity / كيان" in normal user-facing surfaces.
- Keep campaign visibly separate from fund.
- Make family/building/neighborhood/tribe optional, not primary.
- Use operational templates rather than social-type templates.
- Do not create a "multi-wallet fund" template initially; any fund can add wallets later.
- Founder always has advanced settings.
- Founder can delegate advanced settings to another member/manager.
- Do not remove existing capabilities.
- Keep the old flow while building the new flow in parallel.
- Treat production readiness 08 as closed; handle any remaining baseline mismatch inside the 09 phased plan.
- Start implementation with Phase A preflight cleanup before building the new fund/campaign wizard.

## Backlog Conversion Notes

When converting this document into backlog items, each backlog item should identify:

- Product decision covered
- Affected frontend pages/components
- Affected backend service/controller/DTO
- Data migration requirement, if any
- Capability matrix rows protected
- Tests required
- Rollback/fallback plan

No implementation item should be accepted if it simplifies the UI by removing an existing capability without an explicit product decision.
