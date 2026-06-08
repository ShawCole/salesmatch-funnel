function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(env('PORT', '8082'), 10),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-in-prod'),
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
