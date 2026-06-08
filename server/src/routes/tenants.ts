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
