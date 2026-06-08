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
