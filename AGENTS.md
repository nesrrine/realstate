# AGENTS.md

## Build / Type-check / Lint commands

### Frontend (`frontend/`)

```bash
# Type-check
npx tsc --noEmit

# Lint (single file or all)
npx eslint src/<path> --max-warnings 0
npx eslint src --max-warnings 0

# Format check
npx prettier --check "src/**/*.{ts,tsx}"
```

### Backend (`backend/`)

```bash
# Type-check
npx tsc --noEmit

# Migrate
npx prisma generate
npx prisma migrate dev     # development
npx prisma migrate deploy  # production

# Seed (dev)
npx tsx prisma/seed.ts

# Lint
npx eslint src --max-warnings 0

# Swagger docs are auto-generated from decorators (no manual step needed)
```

### Backend API

- Base URL: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/api/health`

### Common test credentials (dev seed)

| Email                | Password      | Role    |
| -------------------- | ------------- | ------- |
| admin@agency.com     | Admin1234!    | ADMIN   |
| manager@agency.com   | Manager1234!  | MANAGER |
| agent@agency.com     | Agent1234!    | AGENT   |
