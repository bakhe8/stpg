param(
  [int]$Limit = 50,
  [switch]$ResetSeedData,
  [switch]$Delete
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$resetScript = Join-Path $PSScriptRoot "seed-reset-docker.ps1"
$safeLimit = [Math]::Max(1, [Math]::Min($Limit, 500))

if ($Delete) {
  throw "Partial deletion of acceptance rows is intentionally disabled. Review the dry-run output, then use -ResetSeedData for a full Docker seed reset when a clean development database is required."
}

Write-Host "Resolving Docker Compose postgres container..."
$postgresId = docker compose -f $composeFile ps -q postgres
if (-not $postgresId) {
  throw "Postgres service is not running. Start it with: docker compose up -d postgres"
}

$sql = @"
WITH candidate_entities AS (
  SELECT
    e.id,
    e.name,
    e.type::text AS type,
    e."profileKey" AS "profileKey",
    e."profileLabel" AS "profileLabel",
    e."parentEntityId" AS "parentEntityId",
    e."templateId" AS "templateId",
    e."isCampaign" AS "isCampaign",
    e."createdAt" AS "createdAt"
  FROM entities e
  WHERE e."profileKey" = 'ACCEPTANCE'
     OR e."profileLabel" = 'Acceptance Harness'
     OR e.name LIKE 'Acceptance %'
),
candidate_wallets AS (
  SELECT w.id, w."entityId"
  FROM wallets w
  JOIN candidate_entities ce ON ce.id = w."entityId"
),
candidate_paths AS (
  SELECT gp.id, gp."walletId"
  FROM governance_paths gp
  JOIN candidate_wallets cw ON cw.id = gp."walletId"
),
candidate_memberships AS (
  SELECT m.id, m."entityId"
  FROM memberships m
  JOIN candidate_entities ce ON ce.id = m."entityId"
),
entity_related AS (
  SELECT
    ce.id,
    (SELECT COUNT(*) FROM candidate_memberships cm WHERE cm."entityId" = ce.id) AS memberships,
    (SELECT COUNT(*) FROM candidate_wallets cw WHERE cw."entityId" = ce.id) AS wallets,
    (
      SELECT COUNT(*)
      FROM candidate_paths cp
      JOIN candidate_wallets cw ON cw.id = cp."walletId"
      WHERE cw."entityId" = ce.id
    ) AS paths,
    (SELECT COUNT(*) FROM entity_policies ep WHERE ep."entityId" = ce.id) AS entity_policies,
    (
      SELECT COUNT(*)
      FROM ledger_accounts la
      LEFT JOIN candidate_wallets cw ON cw.id = la."walletId"
      LEFT JOIN candidate_paths cp ON cp.id = la."governancePathId"
      WHERE la."entityId" = ce.id
         OR cw."entityId" = ce.id
         OR cp."walletId" IN (SELECT id FROM candidate_wallets WHERE "entityId" = ce.id)
    ) AS ledger_accounts,
    (
      SELECT COALESCE(SUM(la.balance), 0)::text
      FROM ledger_accounts la
      LEFT JOIN candidate_wallets cw ON cw.id = la."walletId"
      LEFT JOIN candidate_paths cp ON cp.id = la."governancePathId"
      WHERE la."entityId" = ce.id
         OR cw."entityId" = ce.id
         OR cp."walletId" IN (SELECT id FROM candidate_wallets WHERE "entityId" = ce.id)
    ) AS ledger_balance
  FROM candidate_entities ce
),
related_counts AS (
  SELECT jsonb_build_object(
    'memberships', (SELECT COUNT(*) FROM candidate_memberships),
    'memberPreferences', (
      SELECT COUNT(*)
      FROM member_preferences mp
      JOIN candidate_memberships cm ON cm.id = mp."membershipId"
    ),
    'wallets', (SELECT COUNT(*) FROM candidate_wallets),
    'walletPolicies', (
      SELECT COUNT(*)
      FROM wallet_policies wp
      JOIN candidate_wallets cw ON cw.id = wp."walletId"
    ),
    'paths', (SELECT COUNT(*) FROM candidate_paths),
    'pathPolicies', (
      SELECT COUNT(*)
      FROM path_policies pp
      JOIN candidate_paths cp ON cp.id = pp."governancePathId"
    ),
    'entityPolicies', (
      SELECT COUNT(*)
      FROM entity_policies ep
      JOIN candidate_entities ce ON ce.id = ep."entityId"
    ),
    'ledgerAccounts', (
      SELECT COUNT(*)
      FROM ledger_accounts la
      LEFT JOIN candidate_entities ce ON ce.id = la."entityId"
      LEFT JOIN candidate_wallets cw ON cw.id = la."walletId"
      LEFT JOIN candidate_paths cp ON cp.id = la."governancePathId"
      WHERE ce.id IS NOT NULL OR cw.id IS NOT NULL OR cp.id IS NOT NULL
    ),
    'auditLogs', (
      SELECT COUNT(*)
      FROM audit_logs al
      JOIN candidate_entities ce ON ce.id = al."entityId"
    ),
    'documents', (
      SELECT COUNT(*)
      FROM documents d
      LEFT JOIN candidate_entities ce ON ce.id = d."entityId"
      LEFT JOIN candidate_wallets cw ON cw.id = d."walletId"
      LEFT JOIN candidate_paths cp ON cp.id = d."governancePathId"
      WHERE ce.id IS NOT NULL OR cw.id IS NOT NULL OR cp.id IS NOT NULL
    )
  ) AS counts
),
limited_candidates AS (
  SELECT
    ce.id,
    ce.name,
    ce.type,
    ce."profileKey",
    ce."profileLabel",
    ce."parentEntityId",
    ce."templateId",
    ce."isCampaign",
    ce."createdAt",
    er.memberships,
    er.wallets,
    er.paths,
    er.entity_policies AS "entityPolicies",
    er.ledger_accounts AS "ledgerAccounts",
    er.ledger_balance AS "ledgerBalance"
  FROM candidate_entities ce
  JOIN entity_related er ON er.id = ce.id
  ORDER BY ce."createdAt", ce.name
  LIMIT $safeLimit
)
SELECT jsonb_pretty(jsonb_build_object(
  'status', 'dry-run',
  'candidateSelector', ARRAY[
    'entities.profileKey = ACCEPTANCE',
    'entities.profileLabel = Acceptance Harness',
    'entities.name LIKE Acceptance %'
  ],
  'candidateCount', (SELECT COUNT(*) FROM candidate_entities),
  'returnedCandidateLimit', $safeLimit,
  'relatedCounts', (SELECT counts FROM related_counts),
  'candidates', COALESCE(
    (SELECT jsonb_agg(to_jsonb(limited_candidates)) FROM limited_candidates),
    '[]'::jsonb
  ),
  'safety', jsonb_build_object(
    'defaultAction', 'no rows deleted',
    'partialDelete', 'disabled; schema has ledger, audit, membership, wallet, path, and policy relations without broad cascade',
    'cleanDatabaseCommand', 'cd backend; npm run seed:reset:docker',
    'explicitResetFlag', '-ResetSeedData'
  )
));
"@

Write-Host "Running Phase G acceptance data hygiene dry-run..."
$result = $sql | docker compose -f $composeFile exec -T postgres psql -U postgres -d stgp_dev -t -A
if ($LASTEXITCODE -ne 0) {
  throw "Acceptance data hygiene dry-run failed with exit code $LASTEXITCODE."
}

$result | Write-Output

if ($ResetSeedData) {
  Write-Host "Running full Docker seed reset because -ResetSeedData was provided..."
  & $resetScript
  if ($LASTEXITCODE -ne 0) {
    throw "Docker seed reset failed with exit code $LASTEXITCODE."
  }
}
