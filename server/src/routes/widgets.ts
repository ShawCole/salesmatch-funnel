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
