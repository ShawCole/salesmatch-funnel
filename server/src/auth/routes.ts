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
    { expiresIn: '7d', algorithm: 'HS256' },
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
