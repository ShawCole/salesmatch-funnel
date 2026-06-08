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
