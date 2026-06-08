import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.ts';
import { authRouter } from './auth/routes.ts';
import { authMiddleware } from './auth/middleware.ts';
import { funnelRouter } from './routes/funnel.ts';
import { tenantsRouter } from './routes/tenants.ts';
import { widgetsRouter } from './routes/widgets.ts';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/auth', authRouter);

// Protected routes (all /api/* except health)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return authMiddleware(req, res, next);
});

// Protected API routes
app.use('/api/funnel', funnelRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/widgets', widgetsRouter);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { app };
