# GPMS API

NestJS + Prisma backend for the Garment Production Management System.

This service handles:

- auth and multi-factory access
- buyer/style/material master data
- purchase orders and material requirement calculation
- inventory receive/issue and stock snapshots
- production planning, line assignment, and targets
- cutting batches and bundle generation
- sewing hourly output and line status
- QC inspections, defects, and daily summaries
- target-vs-actual reporting

## Tech Stack

- NestJS 11
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- JWT auth (cookie + bearer token support)
- Swagger/OpenAPI (`/api/docs`)
- Validation via `class-validator` + global `ValidationPipe`

## API Base Path

All controller routes are prefixed with `/api`.

- root: `GET /api`
- health: `GET /api/health`
- swagger: `GET /api/docs`

## Environment Variables

Required by runtime schema (`src/env.schema.ts`):

- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET`
- `FRONTEND_URL` (must be a valid URL)
- `NODE_ENV` (`development` | `test` | `production`)
- `PORT` (optional, positive integer)

## Local Setup

From repo root:

```bash
cd apps/api
pnpm install
```

Run migrations + generate Prisma client:

```bash
pnpm prisma migrate dev
```

Seed demo data:

```bash
pnpm prisma db seed
```

Start dev server:

```bash
pnpm start:dev
```

Build and run production mode:

```bash
pnpm build
pnpm start:prod
```

Deployment entrypoint:

```bash
pnpm deploy:start
```

## Seeded Demo Access

`prisma/seed.ts` creates:

- user: `admin@gpms.com`
- password: `admin123`
- factories: `F001` (primary), `F002` (secondary)

## Authentication and Request Scope

- JWT can be supplied via secure cookie `gpms_access` (set by `POST /api/auth/login`) or `Authorization: Bearer <token>`.
- most endpoints require `x-factory-id` header
- factory access is validated against `UserFactoryAccess`
- global rate limit is `120` requests per minute

Public endpoints:

- `GET /api`
- `GET /api/health`
- `POST /api/auth/login`

Auth endpoints (factory header not required):

- `POST /api/auth/logout`
- `GET /api/auth/me`

## Module and Route Map

All routes below require auth + `x-factory-id` unless noted otherwise.

### Buyers (`/api/buyers`)

- `GET /`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

### Styles and BOM (`/api/styles`)

- `GET /`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/bom`
- `GET /:id/bom`

### Materials (`/api/materials`)

- `GET /`
- `POST /`

### Purchase Orders (`/api/pos`)

- `POST /`
- `POST /:id/items`
- `GET /`
- `GET /:id`
- `POST /:id/confirm`
- `POST /:id/status`
- `GET /:id/material-requirement`

### Plans and Reports

Plans (`/api/plans`):

- `POST /`
- `POST /:id/assign`
- `GET /:id`

Reports (`/api/reports`):

- `GET /plan-vs-actual?date=YYYY-MM-DD`

Note: reports controller/service are currently wired through `PlansModule`.

### Cutting (`/api/cutting`)

- `POST /batches`
- `POST /batches/:id/bundles`
- `GET /batches/:id`
- `GET /bundles?q=...`

### Sewing (`/api/sewing`)

- `POST /hourly-output`
- `GET /line-status?date=YYYY-MM-DD`

### QC (`/api/qc`)

- `POST /inspect`
- `GET /summary?date=YYYY-MM-DD`

### Inventory (`/api/inventory`)

- `POST /receive`
- `POST /issue-to-cutting`
- `GET /stock`

## Important Business Rules (Implemented in Services)

- PO items can only be added while PO is `DRAFT`.
- Non-admin users can move PO status only one step forward.
- `SHIPPED`/`CLOSED` transitions require bundle coverage and latest passing QC per bundle.
- Plan assignment requires PO not `DRAFT`/`SHIPPED`/`CLOSED`, dates inside plan range, valid daily target dates, and non-admin users cannot reassign an already assigned PO item.
- inventory issue rejects quantity above available stock.
- QC passing inspections cannot include defect rows.
- sewing output auto-updates bundle status to `SEWN` when cumulative qty reaches bundle qty.

## Data Model

Prisma schema: `prisma/schema.prisma`

Entity relationship diagrams:

- `docs/er-diagram.md` (Mermaid ER source)
- `docs/er-diagram.png`
- `docs/er-diagram.pdf`

## Scripts

- `pnpm start` / `pnpm start:dev` / `pnpm start:prod`
- `pnpm build`
- `pnpm migrate:deploy`
- `pnpm deploy:start`
- `pnpm test` / `pnpm test:e2e` / `pnpm test:cov`

## Tests

Current tests are minimal boilerplate:

- unit: `src/app.controller.spec.ts`
- e2e: `test/app.e2e-spec.ts`
