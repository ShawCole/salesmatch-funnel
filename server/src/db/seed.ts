import bcrypt from 'bcryptjs';
import { pool } from './pool.ts';

async function seed() {
  // Never seed known-weak demo accounts into a production database.
  if ((process.env.NODE_ENV ?? 'development') === 'production' && !process.env.SEED_FORCE) {
    console.error('Refusing to run dev seed in production. Set SEED_FORCE=1 to override.');
    process.exit(1);
  }
  const seedPassword = process.env.SEED_PASSWORD ?? 'dev123';
  const hash = await bcrypt.hash(seedPassword, 12);

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
  console.log(`Dev logins (password: ${process.env.SEED_PASSWORD ? '<from SEED_PASSWORD>' : 'dev123'}):`);
  console.log('  admin@arkdata.io       — admin');
  console.log('  mp@demo-agency.com     — meta_partner');
  console.log('  partner@fastfundleads.com — partner');
  console.log('  client@salesmatch.co   — tenant');
  await pool.end();
}

seed();
