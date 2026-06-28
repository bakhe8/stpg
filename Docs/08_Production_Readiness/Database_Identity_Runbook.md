# Database Identity Runbook

This runbook prevents false confidence from running seed validation against the
wrong database.

## Local Docker Stack

1. Start the integration stack:

```bash
docker compose up -d postgres backend frontend
```

2. Validate the database from inside the Docker Compose network:

```bash
cd backend
npm run seed:validate:docker
```

The command prints:

- target host, port, database, and user from `DATABASE_URL`
- actual `current_database()`
- actual `current_user`
- `inet_server_addr()`
- `inet_server_port()`
- `pg_postmaster_start_time()`
- dataset counts and validation findings

If `DB_IDENTITY_MISMATCH` appears, do not trust the validation result. Fix
`DATABASE_URL` first, then run the validation again.

Do not treat a host-side `localhost:5432` validation as proof by itself on
Windows. A local Windows PostgreSQL service can answer before Docker's published
port. The `seed:validate:docker` command avoids that ambiguity by using the
Compose network and the service host name `postgres`.

## Expected Local Values

For the default Docker stack inside Compose:

```text
DATABASE_URL=postgres://postgres:stgp2024!@postgres:5432/stgp_dev?sslmode=disable
database=stgp_dev
port=5432
```

## Frontend API URL

For local Next.js development, `NEXT_PUBLIC_API_URL` must include `/api`:

```text
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

The Docker frontend uses the same default in `docker-compose.yml`.

## Role Audit Throttling

The local Docker stack raises throttling to support the 18-account Playwright
audit:

```text
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=1000
```

Production should keep a stricter explicit value.
