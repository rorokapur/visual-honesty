import fs from 'fs';
import path from 'path';
import pool from '../db';

async function migrate() {
  console.log('--- Starting Database Migrations ---');

  try {
    // 1. Create migrations_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, '../../db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure alphabetical order (01, 02, etc.)

    // 3. Get already applied migrations
    const { rows } = await pool.query('SELECT filename FROM migrations_log');
    const appliedFiles = new Set(rows.map((r: any) => r.filename));

    // 4. Apply new migrations
    for (const file of files) {
      if (!appliedFiles.has(file)) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Run the SQL within a transaction for safety
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Successfully applied ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`FAILED to apply ${file}:`, err);
          process.exit(1);
        } finally {
          client.release();
        }
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }

    console.log('--- Migrations Complete ---');
  } catch (err) {
    console.error('Migration script failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
