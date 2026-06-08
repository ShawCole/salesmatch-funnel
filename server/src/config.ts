function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env var: ${key}`);
  return val;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

// Only an explicit local-dev environment gets the zero-config dev fallback.
// Anything else (production, staging, preview, or an unset/unknown NODE_ENV) is
// treated as strict: a known literal secret would let anyone forge tokens.
const isLocalEnv = nodeEnv === 'development' || nodeEnv === 'test';

/**
 * A strong JWT secret is mandatory everywhere except local dev/test. Outside
 * those, refuse to start without a real secret rather than silently falling
 * back to a public literal.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!isLocalEnv) {
    if (!secret || secret.length < 32) {
      throw new Error(
        `JWT_SECRET must be set to a strong value (>= 32 chars) when NODE_ENV is "${nodeEnv}"`,
      );
    }
    return secret;
  }
  if (secret) return secret;
  console.warn(
    '[config] WARNING: using the insecure built-in dev JWT secret. Set JWT_SECRET. ' +
    'Never run a shared/deployed environment with NODE_ENV=development/test.',
  );
  return 'dev-secret-change-in-prod';
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
