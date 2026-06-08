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
    // Pin the algorithm to prevent algorithm-confusion attacks (e.g. alg:none).
    const payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ['HS256'],
    }) as AuthUser;
    // Validate the claim shape before trusting it downstream.
    if (
      !payload ||
      typeof payload.id !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return res.status(401).json({ error: 'Invalid token claims' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
