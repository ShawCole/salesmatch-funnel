function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env var: ${key}`);
  return val;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

/**
 * In production a strong JWT secret is mandatory — falling back to a known
 * literal would let anyone forge tokens. Outside production we allow a dev
 * default so local setup is zero-config.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (nodeEnv === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set to a strong value (>= 32 chars) in production');
    }
    return secret;
  }
  return secret ?? 'dev-secret-change-in-prod';
}

export const config = {
  nodeEnv,
  port: parseInt(env('PORT', '8082'), 10),
  jwtSecret: resolveJwtSecret(),
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
