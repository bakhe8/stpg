$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "stgp2024!" }
$databaseUrl = "postgres://postgres:$dbPassword@postgres:5432/stgp_dev?sslmode=disable"

Write-Host "Resolving Docker Compose postgres container..."
$postgresId = docker compose -f $composeFile ps -q postgres
if (-not $postgresId) {
  throw "Postgres service is not running. Start it with: docker compose up -d postgres"
}

$network = docker inspect -f "{{range `$name, `$network := .NetworkSettings.Networks}}{{println `$name}}{{end}}" $postgresId |
  Select-Object -First 1
if (-not $network) {
  throw "Could not resolve the Docker network for postgres container $postgresId."
}

Write-Host "Docker network: $network"
Write-Host "Resetting and validating seed data inside Docker network..."
docker run --rm `
  --network $network `
  -e "DATABASE_URL=$databaseUrl" `
  -e "SEED_PRINT_DB_IDENTITY=true" `
  -e "SEED_EXPECTED_DB_NAME=stgp_dev" `
  -e "SEED_EXPECTED_DB_PORT=5432" `
  -e "SEED_RESET_ALLOW_NON_LOCAL=true" `
  -v "${backendDir}:/workspace:ro" `
  node:22-alpine `
  sh -lc "mkdir -p /tmp/stgp-backend/src/entities && cp /workspace/package*.json /tmp/stgp-backend/ && cp /workspace/tsconfig*.json /tmp/stgp-backend/ && cp /workspace/prisma.config.ts /tmp/stgp-backend/ && cp -a /workspace/prisma /tmp/stgp-backend/prisma && cp /workspace/src/entities/entity-template-schema.ts /tmp/stgp-backend/src/entities/entity-template-schema.ts && cd /tmp/stgp-backend && npm ci --include=dev --quiet && npx prisma generate && npm run seed:fresh -- --print-db-identity --expected-db-name stgp_dev --expected-db-port 5432"
if ($LASTEXITCODE -ne 0) {
  throw "Docker seed reset failed with exit code $LASTEXITCODE."
}
