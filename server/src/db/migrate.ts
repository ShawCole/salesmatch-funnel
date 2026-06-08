import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const applied = new Set(
    (await pool.query('SELECT name FROM _migrations ORDER BY name')).rows.map(r => r.name)
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`Applying: ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`  ✗ ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  await pool.end();
}

migrate();
