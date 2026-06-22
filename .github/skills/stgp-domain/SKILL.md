---
name: stgp-domain
description: "Domain guidance for CollectiveTrustOS STGP. Use when: mapping features to governance paths, memberships, disputes, policies, ledger entries, entity relationships, and access/privacy rules from Docs/."
---

# STGP Domain Skill

## Purpose
Translate product requests into domain-correct implementation choices for STGP.

## Use This Skill For
- Governance path isolation and voting-related behavior.
- Membership, participation contract, and policy versioning decisions.
- Ledger-safe money flow and auditability constraints.
- Entity relationship modeling and authorization visibility rules.
- Dispute and appeal lifecycle behavior.

## Primary References
- Docs/README.md
- Docs/01_Overview/core_concepts.md
- Docs/02_Architecture/system_architecture.md
- Docs/03_Data_Model/database_schema.md
- Docs/03_Data_Model/financial_ledger.md
- Docs/05_Rules_and_Governance/governance_paths_and_voting.md
- Docs/05_Rules_and_Governance/governance_path_isolation_rules.md
- Docs/05_Rules_and_Governance/access_control_and_privacy.md
- Docs/05_Rules_and_Governance/dispute_management.md

## Workflow
1. Identify which domain concept is touched.
2. Validate constraints from the reference docs above.
3. Propose backend/frontend/data implications.
4. Flag conflicts with governance isolation, privacy, or ledger integrity.
5. Return implementation notes with explicit assumptions.

## Non-Goals
- Do not introduce .NET-specific guidance.
- Do not treat generated Prisma files as editable sources.
