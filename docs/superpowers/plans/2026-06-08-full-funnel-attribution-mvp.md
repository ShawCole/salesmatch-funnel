# Full-Funnel Attribution Dashboard — MVP Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the static salesmatch-funnel prototype into a live, multi-tenant attribution dashboard with Meta + Google Ads data, role-based views, and a widget-based layout system.

**Architecture:** Monorepo with a Node.js/Express backend (`/server`) alongside the existing React frontend (`/src`). Backend runs on GCP Cloud Run, connects to Cloud SQL (Postgres) for persistence and Redis Memorystore for caching/pubsub. Frontend evolves in-place — the existing `PipelineDashboard` becomes the tenant funnel view, the existing demographics/map becomes the drill-down view. A widget system wraps all dashboard sections so layouts are role-configurable. Auth uses JWT with tenant hierarchy claims (Admin > Meta-Partner > Partner > Tenant).

**Tech Stack:** React 19 + TypeScript + Tailwind (existing) | Node.js + Express + PostgreSQL + Redis | Vite dev proxy | JWT auth | Meta Marketing API + Google Ads API

**4-6 Week Phasing:**
- **Plan 1 (this doc) — Weeks 1-2: Foundation** — Backend scaffold, DB schema, auth, widget system, role routing
- **Plan 2 — Weeks 2-3: Data Pipeline** — Meta Ads integration, event normalization, hourly aggregation, live funnel API
- **Plan 3 — Weeks 3-4: Core Views** — Tenant funnel (live data), partner portfolio (sparkline KPIs), funnel→demographics drill-down
- **Plan 4 — Weeks 4-5: Multi-tenant + Google** — Google Ads integration, white-label theming, tenant/partner/meta-partner isolation
- **Plan 5 — Week 6: Ship** — Export (CSV/PDF), live activity feed widget, deploy to Cloud Run, staging/prod

---

## File Structure

### New: `/server` (backend)

```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Express app entry, middleware, routes
│   ├── config.ts                   # env vars, DB/Redis connection strings
│   ├── db/
│   │   ├── pool.ts                 # pg Pool singleton
│   │   ├── migrations/
│   │   │   └── 001-init.sql        # tenants, users, campaigns, funnel_events, widget_layouts
│   │   └── seed.ts                 # dev seed: demo tenant, partner, admin
│   ├── auth/
│   │   ├── middleware.ts           # JWT verify + attach req.user (id, tenantId, role)
│   │   ├── roles.ts               # role hierarchy: admin > meta_partner > partner > tenant
│   │   └── routes.ts              # POST /auth/login, POST /auth/register (admin-only)
│   ├── routes/
│   │   ├── funnel.ts              # GET /api/funnel — aggregated funnel data, scoped by tenant
│   │   ├── campaigns.ts           # GET /api/campaigns — campaign list, scoped
│   │   ├── widgets.ts             # GET/PUT /api/widgets — user's widget layout
│   │   └── tenants.ts             # GET /api/tenants — partner sees their tenants, admin sees all
│   └── services/
│       └── scoping.ts             # tenant hierarchy query helpers (visible_tenants, visible_campaigns)
```

### New: `/src/layouts` (widget system)

```
src/layouts/
├── WidgetShell.tsx                 # wrapper: drag handle, collapse, close, resize
├── WidgetGrid.tsx                  # CSS grid layout engine, reads layout config
├── DashboardLayout.tsx             # role-aware: picks default layout by role, loads saved layout
├── useWidgetLayout.ts              # hook: load/save layout from API, optimistic local state
└── registry.ts                     # widget registry: id → component mapping
```

### New: `/src/views` (role-based pages)

```
src/views/
├── TenantDashboard.tsx             # funnel hero + widget grid (demographics drill-down on stage click)
├── PartnerDashboard.tsx            # alerts section + KPI cards with sparklines
├── MetaPartnerDashboard.tsx        # scoped god-mode: partner list + aggregate metrics
├── AdminDashboard.tsx              # global god-mode
└── LoginPage.tsx                   # email + password → JWT
```

### Modified: existing files

```
src/App.tsx                         # add auth context + role-based router
src/contexts/AuthContext.tsx         # NEW: JWT storage, user state, role
src/components/funnel/*             # evolve: accept live data props instead of static config
```

---

## Task 1: Backend Scaffold + Express Server

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/config.ts`

- [ ] **Step 1: Initialize server package**

```bash
cd /home/shaw/repos/salesmatch-funnel
mkdir -p server/src
```

Write `server/package.json`:
```json
{
  "name": "salesmatch-funnel-server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "express": "^5.1.0",
    "pg": "^8.16.0",
    "ioredis": "^5.6.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "compression": "^1.8.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/pg": "^8.15.4",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/bcryptjs": "^3.0.0",
    "@types/cors": "^2.8.19",
    "@types/compression": "^1.7.5",
    "tsx": "^4.19.0",
    "typescript": "~5.9.3"
  }
}
```

Write `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write config module**

Write `server/src/config.ts`:
```typescript
function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(env('PORT', '8082'), 10),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-in-prod'),
  db: {
    connectionString: env('DATABASE_URL', 'postgresql://localhost:5432/salesmatch'),
  },
  redis: {
    url: env('REDIS_URL', 'redis://localhost:6379'),
  },
  cors: {
    origin: env('CORS_ORIGIN', 'http://localhost:5173'),
  },
};
```

- [ ] **Step 3: Write Express entry point**

Write `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.ts';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app };
```

- [ ] **Step 4: Install dependencies and verify server starts**

```bash
cd /home/shaw/repos/salesmatch-funnel/server
npm install
npm run dev
# In another terminal: curl http://localhost:8082/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

- [ ] **Step 5: Update Vite proxy to match server port**

The existing `vite.config.ts` already proxies `/api` to `localhost:8082`. Verify it matches.

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: scaffold Express backend with health check endpoint"
```

---

## Task 2: Database Schema + Migration Runner

**Files:**
- Create: `server/src/db/pool.ts`
- Create: `server/src/db/migrate.ts`
- Create: `server/src/db/migrations/001-init.sql`

- [ ] **Step 1: Write pg pool singleton**

Write `server/src/db/pool.ts`:
```typescript
import pg from 'pg';
import { config } from '../config.ts';

export const pool = new pg.Pool({
  connectionString: config.db.connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});
```

- [ ] **Step 2: Write migration runner**

Write `server/src/db/migrate.ts`:
```typescript
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const applied = new Set(
    (await pool.query('SELECT name FROM _migrations ORDER BY name')).rows.map(r => r.name)
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`Applying: ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`  ✗ ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  await pool.end();
}

migrate();
```

- [ ] **Step 3: Write initial schema migration**

Write `server/src/db/migrations/001-init.sql`:
```sql
-- Role hierarchy: admin > meta_partner > partner > tenant
CREATE TYPE user_role AS ENUM ('admin', 'meta_partner', 'partner', 'tenant');
CREATE TYPE platform_type AS ENUM ('meta', 'google', 'tiktok', 'linkedin', 'dsp', 'email');
CREATE TYPE funnel_stage AS ENUM (
  'impression', 'click', 'pixel_fire', 'intent_match',
  'audience_sync', 'retarget', 'micro_conversion', 'macro_conversion'
);

-- Tenant hierarchy: admin org at top, meta-partners own partners, partners own tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'tenant',
  parent_id UUID REFERENCES tenants(id),
  -- White-label config
  brand_name VARCHAR(255),
  brand_logo_url TEXT,
  brand_primary_color VARCHAR(7) DEFAULT '#a855f7',
  brand_bg_color VARCHAR(7) DEFAULT '#030712',
  custom_domain VARCHAR(255),
  -- Settings
  lookback_days INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_parent ON tenants(parent_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Users belong to a tenant, inherit its role
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Pipelines: a tenant's named funnel (e.g., "Sales Hires", "CSM Hires")
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipelines_tenant ON pipelines(tenant_id);

-- Campaigns: linked to a pipeline, sourced from an ad platform
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  platform platform_type NOT NULL,
  platform_campaign_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  daily_budget_cents INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_pipeline ON campaigns(pipeline_id);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform, platform_campaign_id);

-- Funnel events: the core attribution data
CREATE TABLE funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID REFERENCES campaigns(id),
  pipeline_id UUID REFERENCES pipelines(id),
  stage funnel_stage NOT NULL,
  platform platform_type,
  count INT NOT NULL DEFAULT 1,
  spend_cents INT DEFAULT 0,
  event_date DATE NOT NULL,
  hour_bucket SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_funnel_events_tenant_date ON funnel_events(tenant_id, event_date DESC);
CREATE INDEX idx_funnel_events_stage ON funnel_events(tenant_id, stage, event_date DESC);
CREATE INDEX idx_funnel_events_campaign ON funnel_events(campaign_id, stage, event_date DESC);
CREATE INDEX idx_funnel_events_pipeline ON funnel_events(pipeline_id, stage, event_date DESC);

-- Widget layouts: per-user dashboard customization
CREATE TABLE widget_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  layout JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Conversion events: micro and macro conversion definitions per tenant
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  event_key VARCHAR(100) NOT NULL,
  is_macro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversion_events_tenant ON conversion_events(tenant_id);

-- Row-level security policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 4: Create local Postgres database and run migration**

```bash
createdb salesmatch 2>/dev/null || true
cd /home/shaw/repos/salesmatch-funnel/server
npm run migrate
# Expected: "Applying: 001-init.sql" then "✓ 001-init.sql" then "Migrations complete."
```

- [ ] **Step 5: Verify tables exist**

```bash
psql salesmatch -c "\dt"
# Expected: tenants, users, pipelines, campaigns, funnel_events, widget_layouts, conversion_events, _migrations
```

- [ ] **Step 6: Commit**

```bash
git add server/src/db/
git commit -m "feat: add database schema with tenant hierarchy, funnel events, widget layouts"
```

---

## Task 3: Auth System — JWT + Role Hierarchy

**Files:**
- Create: `server/src/auth/roles.ts`
- Create: `server/src/auth/middleware.ts`
- Create: `server/src/auth/routes.ts`
- Create: `server/src/services/scoping.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write role hierarchy module**

Write `server/src/auth/roles.ts`:
```typescript
export type Role = 'admin' | 'meta_partner' | 'partner' | 'tenant';

const ROLE_LEVEL: Record<Role, number> = {
  admin: 100,
  meta_partner: 75,
  partner: 50,
  tenant: 25,
};

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

export function requireRole(requiredRole: Role) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !canAccess(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

- [ ] **Step 2: Write JWT auth middleware**

Write `server/src/auth/middleware.ts`:
```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import type { Role } from './roles.ts';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 3: Write tenant scoping service**

This is the core multi-tenant isolation logic. A user can see their own tenant and all tenants below them in the hierarchy.

Write `server/src/services/scoping.ts`:
```typescript
import { pool } from '../db/pool.ts';
import type { AuthUser } from '../auth/middleware.ts';

/**
 * Returns all tenant IDs visible to the given user.
 * - admin: all tenants
 * - meta_partner: own tenant + all descendants (partners + their tenants)
 * - partner: own tenant + all child tenants
 * - tenant: own tenant only
 */
export async function visibleTenantIds(user: AuthUser): Promise<string[]> {
  if (user.role === 'admin') {
    const res = await pool.query('SELECT id FROM tenants');
    return res.rows.map(r => r.id);
  }

  // Recursive CTE: find this tenant + all descendants
  const res = await pool.query(`
    WITH RECURSIVE tree AS (
      SELECT id FROM tenants WHERE id = $1
      UNION ALL
      SELECT t.id FROM tenants t JOIN tree tr ON t.parent_id = tr.id
    )
    SELECT id FROM tree
  `, [user.tenantId]);

  return res.rows.map(r => r.id);
}

/**
 * SQL fragment for WHERE clause scoping.
 * Returns { clause: string, params: any[] } to append to queries.
 */
export async function scopeWhere(
  user: AuthUser,
  tenantColumn = 'tenant_id',
  paramOffset = 1,
): Promise<{ clause: string; params: string[] }> {
  const ids = await visibleTenantIds(user);
  const placeholders = ids.map((_, i) => `$${paramOffset + i}`).join(', ');
  return {
    clause: `${tenantColumn} IN (${placeholders})`,
    params: ids,
  };
}
```

- [ ] **Step 4: Write auth routes (login + register)**

Write `server/src/auth/routes.ts`:
```typescript
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.ts';
import { config } from '../config.ts';
import { authMiddleware } from './middleware.ts';
import { requireRole } from './roles.ts';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = await pool.query(`
    SELECT u.id, u.email, u.password_hash, u.name, u.tenant_id, t.role, t.slug,
           t.brand_name, t.brand_logo_url, t.brand_primary_color, t.brand_bg_color
    FROM users u JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = $1 AND u.is_active = true
  `, [email]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenant_id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' },
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantSlug: user.slug,
      brand: {
        name: user.brand_name,
        logoUrl: user.brand_logo_url,
        primaryColor: user.brand_primary_color,
        bgColor: user.brand_bg_color,
      },
    },
  });
});

// Admin-only: create new users
authRouter.post('/register', authMiddleware, requireRole('admin'), async (req, res) => {
  const { email, password, name, tenantId } = req.body;
  if (!email || !password || !tenantId) {
    return res.status(400).json({ error: 'email, password, and tenantId required' });
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, hash, name, tenantId],
  );

  res.status(201).json({ id: result.rows[0].id });
});
```

- [ ] **Step 5: Wire auth routes into Express app**

Update `server/src/index.ts` — add after the health check:
```typescript
import { authRouter } from './auth/routes.ts';
import { authMiddleware } from './auth/middleware.ts';

// ... after app.use(express.json());

// Public routes
app.use('/auth', authRouter);

// Protected routes (all /api/* except health)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return authMiddleware(req, res, next);
});
```

- [ ] **Step 6: Commit**

```bash
git add server/src/auth/ server/src/services/ server/src/index.ts
git commit -m "feat: add JWT auth with role hierarchy and tenant scoping"
```

---

## Task 4: Dev Seed Data

**Files:**
- Create: `server/src/db/seed.ts`

- [ ] **Step 1: Write seed script**

Write `server/src/db/seed.ts`:
```typescript
import bcrypt from 'bcryptjs';
import { pool } from './pool.ts';

async function seed() {
  const hash = await bcrypt.hash('dev123', 12);

  // ArkData admin tenant
  const adminRes = await pool.query(`
    INSERT INTO tenants (name, slug, role) VALUES ('ArkData', 'arkdata', 'admin')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const adminTenantId = adminRes.rows[0].id;

  // Meta-partner: Demo Agency Group
  const mpRes = await pool.query(`
    INSERT INTO tenants (name, slug, role, parent_id) VALUES ('Demo Agency Group', 'demo-agency-group', 'meta_partner', $1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [adminTenantId]);
  const metaPartnerId = mpRes.rows[0].id;

  // Partner: Fast Fund Leads Agency
  const partnerRes = await pool.query(`
    INSERT INTO tenants (name, slug, role, parent_id) VALUES ('Fast Fund Leads Agency', 'fast-fund-leads', 'partner', $1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [metaPartnerId]);
  const partnerId = partnerRes.rows[0].id;

  // Tenant: Sales Match (the client)
  const tenantRes = await pool.query(`
    INSERT INTO tenants (name, slug, role, parent_id, brand_name, brand_primary_color)
    VALUES ('Sales Match', 'sales-match', 'tenant', $1, 'Sales Match', '#6366f1')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [partnerId]);
  const tenantId = tenantRes.rows[0].id;

  // Users — one per role
  for (const [email, tId] of [
    ['admin@arkdata.io', adminTenantId],
    ['mp@demo-agency.com', metaPartnerId],
    ['partner@fastfundleads.com', partnerId],
    ['client@salesmatch.co', tenantId],
  ] as const) {
    await pool.query(`
      INSERT INTO users (email, password_hash, name, tenant_id)
      VALUES ($1, $2, split_part($1, '@', 1), $3)
      ON CONFLICT (email) DO NOTHING
    `, [email, hash, tId]);
  }

  // Pipelines for Sales Match
  const p1 = await pool.query(`
    INSERT INTO pipelines (tenant_id, name, description, color)
    VALUES ($1, 'Sales Hires', 'In-market ICP — sales hiring intent', '#6366f1')
    RETURNING id
  `, [tenantId]);
  const p2 = await pool.query(`
    INSERT INTO pipelines (tenant_id, name, description, color)
    VALUES ($1, 'CSM Hires', 'In-market ICP — CSM hiring intent', '#10b981')
    RETURNING id
  `, [tenantId]);

  // Sample funnel events (last 30 days)
  const today = new Date();
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const decay = 1 + (dayOffset / 30) * 0.5; // older days have slightly lower counts

    for (const [pipelineId, scale] of [[p1.rows[0].id, 1], [p2.rows[0].id, 1.5]] as const) {
      const stages: [string, number][] = [
        ['impression', Math.round(29000 / decay * scale)],
        ['click', Math.round(400 / decay * scale)],
        ['pixel_fire', Math.round(100 / decay * scale)],
        ['intent_match', Math.round(60 / decay * scale)],
        ['audience_sync', Math.round(55 / decay * scale)],
        ['retarget', Math.round(40 / decay * scale)],
        ['micro_conversion', Math.round(8 / decay * scale)],
        ['macro_conversion', Math.round(2 / decay * scale)],
      ];

      for (const [stage, count] of stages) {
        await pool.query(`
          INSERT INTO funnel_events (tenant_id, pipeline_id, stage, platform, count, spend_cents, event_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          tenantId, pipelineId, stage,
          Math.random() > 0.5 ? 'meta' : 'google',
          count,
          stage === 'impression' ? Math.round(count * 0.35) : 0,
          dateStr,
        ]);
      }
    }
  }

  console.log('Seed complete.');
  console.log('Dev logins (password: dev123):');
  console.log('  admin@arkdata.io       — admin');
  console.log('  mp@demo-agency.com     — meta_partner');
  console.log('  partner@fastfundleads.com — partner');
  console.log('  client@salesmatch.co   — tenant');
  await pool.end();
}

seed();
```

- [ ] **Step 2: Add seed script to package.json**

In `server/package.json`, add to scripts:
```json
"seed": "tsx src/db/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd /home/shaw/repos/salesmatch-funnel/server
npm run seed
# Expected: "Seed complete." with 4 dev login emails
```

- [ ] **Step 4: Verify seed data**

```bash
psql salesmatch -c "SELECT slug, role, parent_id IS NOT NULL as has_parent FROM tenants ORDER BY role"
# Expected: 4 rows — admin, meta_partner, partner, tenant
psql salesmatch -c "SELECT COUNT(*) FROM funnel_events"
# Expected: ~496 rows (31 days × 2 pipelines × 8 stages)
```

- [ ] **Step 5: Commit**

```bash
git add server/src/db/seed.ts server/package.json
git commit -m "feat: add dev seed with tenant hierarchy and 30 days of funnel events"
```

---

## Task 5: Core API Routes — Funnel + Tenants

**Files:**
- Create: `server/src/routes/funnel.ts`
- Create: `server/src/routes/tenants.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write funnel data API**

Write `server/src/routes/funnel.ts`:
```typescript
import { Router } from 'express';
import { pool } from '../db/pool.ts';
import { scopeWhere } from '../services/scoping.ts';
import type { AuthUser } from '../auth/middleware.ts';

export const funnelRouter = Router();

// GET /api/funnel?pipeline_id=X&days=30
funnelRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const days = Math.min(parseInt(req.query.days as string) || 30, 90);
  const pipelineId = req.query.pipeline_id as string | undefined;

  const scope = await scopeWhere(user, 'fe.tenant_id');

  let query = `
    SELECT
      fe.stage,
      fe.platform,
      SUM(fe.count) as total_count,
      SUM(fe.spend_cents) as total_spend_cents,
      fe.event_date
    FROM funnel_events fe
    WHERE ${scope.clause}
      AND fe.event_date >= CURRENT_DATE - $${scope.params.length + 1}::int
  `;
  const params: any[] = [...scope.params, days];

  if (pipelineId) {
    params.push(pipelineId);
    query += ` AND fe.pipeline_id = $${params.length}`;
  }

  query += ` GROUP BY fe.stage, fe.platform, fe.event_date ORDER BY fe.event_date`;

  const result = await pool.query(query, params);

  // Aggregate into stage summaries
  const stages: Record<string, { total: number; spend_cents: number; by_platform: Record<string, number>; by_date: Record<string, number> }> = {};

  for (const row of result.rows) {
    if (!stages[row.stage]) {
      stages[row.stage] = { total: 0, spend_cents: 0, by_platform: {}, by_date: {} };
    }
    const s = stages[row.stage];
    const count = parseInt(row.total_count);
    s.total += count;
    s.spend_cents += parseInt(row.total_spend_cents);
    s.by_platform[row.platform] = (s.by_platform[row.platform] || 0) + count;
    const dateKey = row.event_date.toISOString().split('T')[0];
    s.by_date[dateKey] = (s.by_date[dateKey] || 0) + count;
  }

  res.json({ days, stages });
});

// GET /api/funnel/pipelines — list pipelines visible to user
funnelRouter.get('/pipelines', async (req, res) => {
  const user = req.user as AuthUser;
  const scope = await scopeWhere(user, 'p.tenant_id');

  const result = await pool.query(`
    SELECT p.id, p.name, p.description, p.color, p.tenant_id, t.name as tenant_name
    FROM pipelines p JOIN tenants t ON p.tenant_id = t.id
    WHERE ${scope.clause} AND p.is_active = true
    ORDER BY t.name, p.name
  `, scope.params);

  res.json(result.rows);
});
```

- [ ] **Step 2: Write tenants API**

Write `server/src/routes/tenants.ts`:
```typescript
import { Router } from 'express';
import { pool } from '../db/pool.ts';
import { visibleTenantIds } from '../services/scoping.ts';
import type { AuthUser } from '../auth/middleware.ts';

export const tenantsRouter = Router();

// GET /api/tenants — list tenants visible to user, with summary metrics
tenantsRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const ids = await visibleTenantIds(user);

  if (ids.length === 0) return res.json([]);

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

  const result = await pool.query(`
    SELECT
      t.id, t.name, t.slug, t.role, t.parent_id,
      t.brand_name, t.brand_primary_color,
      COUNT(DISTINCT p.id) as pipeline_count,
      COALESCE(SUM(fe.count) FILTER (WHERE fe.stage = 'impression' AND fe.event_date >= CURRENT_DATE - 7), 0) as impressions_7d,
      COALESCE(SUM(fe.count) FILTER (WHERE fe.stage = 'macro_conversion' AND fe.event_date >= CURRENT_DATE - 7), 0) as conversions_7d,
      COALESCE(SUM(fe.spend_cents) FILTER (WHERE fe.event_date >= CURRENT_DATE - 7), 0) as spend_7d_cents
    FROM tenants t
    LEFT JOIN pipelines p ON p.tenant_id = t.id AND p.is_active = true
    LEFT JOIN funnel_events fe ON fe.tenant_id = t.id
    WHERE t.id IN (${placeholders})
    GROUP BY t.id
    ORDER BY t.name
  `, ids);

  res.json(result.rows);
});
```

- [ ] **Step 3: Wire routes into Express app**

Update `server/src/index.ts` — add after the auth middleware block:
```typescript
import { funnelRouter } from './routes/funnel.ts';
import { tenantsRouter } from './routes/tenants.ts';

// Protected API routes
app.use('/api/funnel', funnelRouter);
app.use('/api/tenants', tenantsRouter);
```

- [ ] **Step 4: Test the API manually**

```bash
# Start server
cd /home/shaw/repos/salesmatch-funnel/server && npm run dev &

# Login as tenant user
TOKEN=$(curl -s -X POST http://localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"client@salesmatch.co","password":"dev123"}' | jq -r '.token')

# Fetch funnel data — should only see Sales Match data
curl -s http://localhost:8082/api/funnel?days=7 -H "Authorization: Bearer $TOKEN" | jq '.stages | keys'
# Expected: ["audience_sync","click","impression","intent_match","macro_conversion","micro_conversion","pixel_fire","retarget"]

# Login as partner — should see same data (partner owns Sales Match)
PTOKEN=$(curl -s -X POST http://localhost:8082/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"partner@fastfundleads.com","password":"dev123"}' | jq -r '.token')
curl -s http://localhost:8082/api/tenants -H "Authorization: Bearer $PTOKEN" | jq '.[].name'
# Expected: "Fast Fund Leads Agency" and "Sales Match"
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: add funnel and tenants API endpoints with tenant-scoped isolation"
```

---

## Task 6: Frontend Auth Context + Role Router

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/views/LoginPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write AuthContext**

Write `src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface Brand {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string;
  bgColor: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'meta_partner' | 'partner' | 'tenant';
  tenantSlug: string;
  brand: Brand;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

const TOKEN_KEY = 'sm-auth-token';
const USER_KEY = 'sm-auth-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        return { token, user: JSON.parse(userJson), loading: false };
      } catch { /* fall through */ }
    }
    return { token: null, user: null, loading: false };
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(body.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.token, user: data.user, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null, loading: false });
  }, []);

  // Apply brand colors as CSS custom properties
  useEffect(() => {
    if (state.user?.brand) {
      document.documentElement.style.setProperty('--brand-primary', state.user.brand.primaryColor);
      document.documentElement.style.setProperty('--brand-bg', state.user.brand.bgColor);
    }
  }, [state.user?.brand]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Fetch helper that auto-attaches Bearer token */
export function useAuthFetch() {
  const { token, logout } = useAuth();
  return useCallback(async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401) logout();
    return res;
  }, [token, logout]);
}
```

- [ ] **Step 2: Write LoginPage**

Write `src/views/LoginPage.tsx`:
```typescript
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm glass rounded-2xl p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Sign In</h1>
          <p className="text-xs text-gray-400 mt-1">Attribution Dashboard</p>
        </div>

        {error && (
          <div className="text-xs text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx — add auth wrapping and role-based routing**

Replace `src/App.tsx` with the auth-aware version. The existing funnel and map views remain, but are wrapped in auth and routed by role.

```typescript
import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './views/LoginPage';
import { FilterProvider } from './contexts/FilterContext';
import { PipelineDashboard } from './components/funnel/PipelineDashboard';
import { MapView } from './components/MapView';
import { FilterBar } from './components/FilterBar';
import { StatsBar } from './components/StatsBar';
import { DraggableCard } from './components/DraggableCard';
import { Sidebar, CARD_CONFIGS } from './components/Sidebar';
import { MobileChartBar } from './components/MobileChartBar';
import { AgeGenderCard } from './components/cards/AgeGenderCard';
import { NetWorthCard } from './components/cards/NetWorthCard';
import { IncomeCard } from './components/cards/IncomeCard';
import { CreditRatingCard } from './components/cards/CreditRatingCard';
import { TopCitiesCard } from './components/cards/TopCitiesCard';
import { FamilyDynamicsCard } from './components/cards/FamilyDynamicsCard';
import { LanguageCard } from './components/cards/LanguageCard';
import { HeadcountCard } from './components/cards/HeadcountCard';
import { CompanyRevenueCard } from './components/cards/CompanyRevenueCard';

const MOBILE_BREAKPOINT = 768;

const PCT_POSITIONS: Record<string, [number, number]> = {
  'family':          [0.025, 0.100],
  'language':        [0.207, 0.100],
  'credit':          [0.396, 0.100],
  'income':          [0.025, 0.380],
  'net-worth':       [0.236, 0.380],
  'headcount':       [0.450, 0.380],
  'company-revenue': [0.025, 0.620],
  'age-gender':      [0.236, 0.620],
  'top-cities':      [0.450, 0.620],
};

function computePositions() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const result: Record<string, { x: number; y: number }> = {};
  for (const [id, [xPct, yPct]] of Object.entries(PCT_POSITIONS)) {
    result[id] = { x: Math.round(w * xPct), y: Math.round(h * yPct) };
  }
  return result;
}

const GRID_ORDER = [
  'headcount',        'company-revenue',
  'age-gender',       'top-cities',
  'income',           'credit',
  'net-worth',        'family',
  'language',
];

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'funnel' | 'map'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'map' ? 'map' : 'funnel';
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CARD_CONFIGS.map(c => [c.id, true])),
  );
  const [positions, setPositions] = useState(computePositions);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [panelOpen, setPanelOpen] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setPositions(computePositions());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onToggle = useCallback((id: string) => {
    setVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const desktopCards: { id: string; node: React.ReactNode }[] = [
    { id: 'age-gender',       node: <AgeGenderCard onClose={() => onToggle('age-gender')} /> },
    { id: 'top-cities',       node: <TopCitiesCard onClose={() => onToggle('top-cities')} /> },
    { id: 'income',           node: <IncomeCard onClose={() => onToggle('income')} /> },
    { id: 'credit',           node: <CreditRatingCard onClose={() => onToggle('credit')} /> },
    { id: 'net-worth',        node: <NetWorthCard onClose={() => onToggle('net-worth')} /> },
    { id: 'family',           node: <FamilyDynamicsCard onClose={() => onToggle('family')} /> },
    { id: 'language',         node: <LanguageCard onClose={() => onToggle('language')} /> },
    { id: 'headcount',        node: <HeadcountCard onClose={() => onToggle('headcount')} /> },
    { id: 'company-revenue',  node: <CompanyRevenueCard onClose={() => onToggle('company-revenue')} /> },
  ];

  const mobileCardMap: Record<string, React.ReactNode> = {
    'age-gender':       <AgeGenderCard onClose={() => onToggle('age-gender')} compact />,
    'top-cities':       <TopCitiesCard onClose={() => onToggle('top-cities')} compact />,
    'income':           <IncomeCard onClose={() => onToggle('income')} compact />,
    'credit':           <CreditRatingCard onClose={() => onToggle('credit')} compact />,
    'net-worth':        <NetWorthCard onClose={() => onToggle('net-worth')} compact />,
    'family':           <FamilyDynamicsCard onClose={() => onToggle('family')} compact />,
    'language':         <LanguageCard onClose={() => onToggle('language')} compact />,
    'headcount':        <HeadcountCard onClose={() => onToggle('headcount')} compact />,
    'company-revenue':  <CompanyRevenueCard onClose={() => onToggle('company-revenue')} compact />,
  };

  const visibleMobileCards = GRID_ORDER.filter(id => visibility[id]);

  const ViewToggle = () => (
    <div className="fixed top-4 right-4 z-[300] flex gap-1 glass rounded-lg p-1">
      {user && (
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white transition-all"
        >
          Sign Out
        </button>
      )}
      <button
        onClick={() => setView('funnel')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'funnel' ? 'bg-purple-600/40 text-purple-200' : 'text-gray-400 hover:text-white'}`}
      >
        Funnel
      </button>
      <button
        onClick={() => setView('map')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'map' ? 'bg-purple-600/40 text-purple-200' : 'text-gray-400 hover:text-white'}`}
      >
        Map
      </button>
    </div>
  );

  if (view === 'funnel') {
    return (
      <>
        <ViewToggle />
        <PipelineDashboard />
      </>
    );
  }

  if (isMobile) {
    return (
      <FilterProvider>
        <div className="relative w-screen h-dvh overflow-hidden bg-gray-950">
          <MapView mobilePanelOpen={panelOpen} />
          <div className="absolute top-0 left-0 right-0 z-10 p-3 pointer-events-none">
            <FilterBar onCollapseChange={setFiltersCollapsed} />
            <div className="flex justify-end mt-2">
              <StatsBar hideExport={filtersCollapsed} />
            </div>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col pointer-events-auto bg-gray-950/95 backdrop-blur-lg border-t border-white/10 transition-all duration-300"
            style={{ maxHeight: panelOpen ? 'calc(244px + 70px + env(safe-area-inset-bottom, 0px))' : '0px' }}
            onPointerEnter={() => window.dispatchEvent(new Event('chart-panel-enter'))}
          >
            <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scroll-smooth">
              {visibleMobileCards.length > 0 ? (
                <div className="mobile-grid">
                  {Array.from({ length: Math.ceil(visibleMobileCards.length / 2) }, (_, i) => {
                    const left = visibleMobileCards[i * 2];
                    const right = visibleMobileCards[i * 2 + 1];
                    return (
                      <div key={left} className="grid grid-cols-2 snap-start border-b border-white/[0.06]">
                        <div className="min-h-[220px] border-r border-white/[0.06]">
                          {mobileCardMap[left]}
                        </div>
                        {right && (
                          <div className="min-h-[220px]">
                            {mobileCardMap[right]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Tap a chart below to show it
                </div>
              )}
            </div>
            <MobileChartBar visibility={visibility} onToggle={onToggle} />
          </div>
          <button
            onClick={() => setPanelOpen(prev => !prev)}
            className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto px-6 py-1 rounded-t-lg bg-gray-950/90 backdrop-blur border border-b-0 border-white/10 text-gray-400 transition-all"
            style={{ bottom: panelOpen ? 'calc(244px + 70px + env(safe-area-inset-bottom, 0px))' : '0px', transition: 'bottom 0.3s' }}
          >
            <svg width="20" height="10" viewBox="0 0 20 10" className={`transition-transform duration-300 ${panelOpen ? '' : 'rotate-180'}`}>
              <path d="M2 2 L10 8 L18 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </FilterProvider>
    );
  }

  return (
    <FilterProvider>
      <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
        <ViewToggle />
        <MapView />
        <div className="absolute top-0 left-0 right-0 z-[200] p-3 pointer-events-none">
          <FilterBar onCollapseChange={setFiltersCollapsed} />
          <div className="flex justify-end mt-2">
            <StatsBar hideExport={filtersCollapsed} />
          </div>
        </div>
        <Sidebar visibility={visibility} onToggle={onToggle} />

        {desktopCards.map(c => (
          <DraggableCard
            key={c.id}
            id={c.id}
            defaultX={positions[c.id].x}
            defaultY={positions[c.id].y}
            visible={visibility[c.id]}
          >
            {c.node}
          </DraggableCard>
        ))}
      </div>
    </FilterProvider>
  );
}

function App() {
  const { user } = useAuth();

  // Allow unauthenticated access if ?demo=true (preserves current prototype behavior)
  const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

  if (!user && !isDemo) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Update main.tsx to use AppWrapper**

The existing `main.tsx` imports `App` from `./App`. Since we changed the default export to `AppWrapper`, no change is needed if it imports the default. Verify:

```bash
grep -n 'App' src/main.tsx
# Should show: import App from './App' — this will get AppWrapper since it's the default export
```

- [ ] **Step 5: Verify the app still runs (with ?demo=true for existing behavior)**

```bash
cd /home/shaw/repos/salesmatch-funnel && npm run dev
# Visit http://localhost:5173 — should see login page
# Visit http://localhost:5173?demo=true — should see existing prototype
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx src/views/LoginPage.tsx src/App.tsx
git commit -m "feat: add auth context, login page, and role-based routing shell"
```

---

## Task 7: Widget System Foundation

**Files:**
- Create: `src/layouts/registry.ts`
- Create: `src/layouts/WidgetShell.tsx`
- Create: `src/layouts/WidgetGrid.tsx`
- Create: `src/layouts/DashboardLayout.tsx`
- Create: `src/layouts/useWidgetLayout.ts`

- [ ] **Step 1: Write widget registry**

Write `src/layouts/registry.ts`:
```typescript
import type { ComponentType } from 'react';

export interface WidgetDef {
  id: string;
  label: string;
  component: ComponentType<{ widgetId: string }>;
  defaultSize: { w: number; h: number };  // grid units
  minSize?: { w: number; h: number };
  roles: Array<'admin' | 'meta_partner' | 'partner' | 'tenant'>;
}

const registry = new Map<string, WidgetDef>();

export function registerWidget(def: WidgetDef) {
  registry.set(def.id, def);
}

export function getWidget(id: string): WidgetDef | undefined {
  return registry.get(id);
}

export function getWidgetsForRole(role: string): WidgetDef[] {
  return [...registry.values()].filter(w => w.roles.includes(role as any));
}

export interface WidgetPlacement {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export type LayoutConfig = WidgetPlacement[];
```

- [ ] **Step 2: Write WidgetShell**

Write `src/layouts/WidgetShell.tsx`:
```typescript
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface WidgetShellProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  collapsible?: boolean;
  className?: string;
}

export function WidgetShell({ title, children, onClose, collapsible = true, className = '' }: WidgetShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`glass rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-500 hover:text-white transition-colors">
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Write WidgetGrid**

Write `src/layouts/WidgetGrid.tsx`:
```typescript
import type { LayoutConfig } from './registry';
import { getWidget } from './registry';
import { WidgetShell } from './WidgetShell';

interface WidgetGridProps {
  layout: LayoutConfig;
  onRemove?: (widgetId: string) => void;
}

export function WidgetGrid({ layout, onRemove }: WidgetGridProps) {
  const visibleWidgets = layout.filter(p => p.visible);

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {visibleWidgets.map(placement => {
        const def = getWidget(placement.widgetId);
        if (!def) return null;
        const Component = def.component;

        return (
          <div
            key={placement.widgetId}
            className="col-span-12"
            style={{
              gridColumn: `span ${Math.min(placement.w, 12)}`,
            }}
          >
            <WidgetShell
              title={def.label}
              onClose={onRemove ? () => onRemove(placement.widgetId) : undefined}
            >
              <Component widgetId={placement.widgetId} />
            </WidgetShell>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write useWidgetLayout hook**

Write `src/layouts/useWidgetLayout.ts`:
```typescript
import { useState, useCallback, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../contexts/AuthContext';
import { getWidgetsForRole, type LayoutConfig } from './registry';

function defaultLayoutForRole(role: string): LayoutConfig {
  const widgets = getWidgetsForRole(role);
  return widgets.map((w, i) => ({
    widgetId: w.id,
    x: 0,
    y: i,
    w: w.defaultSize.w,
    h: w.defaultSize.h,
    visible: true,
  }));
}

export function useWidgetLayout() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [layout, setLayout] = useState<LayoutConfig>(() =>
    defaultLayoutForRole(user?.role || 'tenant')
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/widgets')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.layout?.length > 0) {
          setLayout(data.layout);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user, authFetch]);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => prev.map(p =>
      p.widgetId === widgetId ? { ...p, visible: false } : p
    ));
  }, []);

  const saveLayout = useCallback(async (newLayout: LayoutConfig) => {
    setLayout(newLayout);
    await authFetch('/api/widgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: newLayout }),
    });
  }, [authFetch]);

  return { layout, loaded, removeWidget, saveLayout };
}
```

- [ ] **Step 5: Write DashboardLayout**

Write `src/layouts/DashboardLayout.tsx`:
```typescript
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WidgetGrid } from './WidgetGrid';
import { useWidgetLayout } from './useWidgetLayout';

interface DashboardLayoutProps {
  header?: ReactNode;
  children?: ReactNode;
}

export function DashboardLayout({ header, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { layout, removeWidget } = useWidgetLayout();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">
              <span style={{ color: 'var(--brand-primary, #a855f7)' }}>
                {user?.brand?.name || 'Attribution'}
              </span>
              {' '}Dashboard
            </h1>
            {user && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 uppercase tracking-wider">
                {user.role.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-xs text-gray-500">{user.email}</span>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {header}
        {children}
        <WidgetGrid layout={layout} onRemove={removeWidget} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
mkdir -p src/layouts
git add src/layouts/
git commit -m "feat: add widget system — registry, shell, grid, layout hook, dashboard layout"
```

---

## Task 8: Widget Layout API Route

**Files:**
- Create: `server/src/routes/widgets.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write widgets route**

Write `server/src/routes/widgets.ts`:
```typescript
import { Router } from 'express';
import { pool } from '../db/pool.ts';
import type { AuthUser } from '../auth/middleware.ts';

export const widgetsRouter = Router();

// GET /api/widgets — get user's saved layout
widgetsRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const result = await pool.query(
    'SELECT layout FROM widget_layouts WHERE user_id = $1',
    [user.id],
  );
  if (result.rows.length === 0) {
    return res.json({ layout: [] });
  }
  res.json({ layout: result.rows[0].layout });
});

// PUT /api/widgets — save user's layout
widgetsRouter.put('/', async (req, res) => {
  const user = req.user as AuthUser;
  const { layout } = req.body;
  if (!Array.isArray(layout)) {
    return res.status(400).json({ error: 'layout must be an array' });
  }

  await pool.query(`
    INSERT INTO widget_layouts (user_id, layout, updated_at)
    VALUES ($1, $2, now())
    ON CONFLICT (user_id) DO UPDATE SET layout = $2, updated_at = now()
  `, [user.id, JSON.stringify(layout)]);

  res.json({ ok: true });
});
```

- [ ] **Step 2: Wire into Express app**

Add to `server/src/index.ts`:
```typescript
import { widgetsRouter } from './routes/widgets.ts';

app.use('/api/widgets', widgetsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/widgets.ts server/src/index.ts
git commit -m "feat: add widget layout persistence API"
```

---

## Plan 1 Complete — What This Delivers

After these 8 tasks, you have:

1. **Backend server** — Express on port 8082, proxied by Vite dev server
2. **Database** — PostgreSQL with tenant hierarchy, funnel events, widget layouts, and RLS enabled
3. **Auth** — JWT login, role-based middleware, tenant-scoped data isolation
4. **Seed data** — 4 dev users (admin/meta-partner/partner/tenant), 2 pipelines, 30 days of funnel events
5. **Core APIs** — `/api/funnel` (aggregated, tenant-scoped), `/api/tenants` (with 7d summary metrics), `/api/widgets` (layout CRUD)
6. **Frontend auth** — AuthContext, LoginPage, `?demo=true` escape hatch for existing prototype
7. **Widget system** — registry, shell, grid, layout hook, DashboardLayout component
8. **Existing prototype preserved** — all current funnel + map views still work via `?demo=true`

**Next plan (Plan 2)** builds on this foundation: Meta Ads API integration, event normalization, hourly cron aggregation, and wiring the live funnel API into the existing PipelineDashboard component.
