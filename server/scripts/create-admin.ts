import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(process.cwd(), '../.env') });

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT!)
});

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npx tsx create-admin.ts <email> <password>');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
      [email, hash]
    );
    console.log(`✅ Admin account created/updated successfully for: ${email}`);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
  } finally {
    pool.end();
  }
}

createAdmin();
