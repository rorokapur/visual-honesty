import { Pool } from 'pg';
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

async function clearStudyData() {
  console.log('⚠️  WARNING: This will delete ALL participant responses and generated statistics.');
  console.log('Stimuli, categories, and admin accounts will be preserved.');
  
  // Basic confirmation check to avoid accidental runs
  if (process.argv[2] !== '--confirm') {
    console.error('If you are sure, run this script with the --confirm flag:');
    console.error('docker exec -it local-backend npm run clear-responses:prod -- --confirm');
    process.exit(1);
  }

  try {
    // Delete in order to respect foreign key constraints
    await pool.query('DELETE FROM responses');
    await pool.query('DELETE FROM participant_stats');
    await pool.query('DELETE FROM ai_stats');
    await pool.query('DELETE FROM participants');
    // If you also want to clear sessions (connect-pg-simple) uncomment below
    // await pool.query('DELETE FROM session');

    console.log('✅ Study data successfully cleared!');
  } catch (error) {
    console.error('❌ Failed to clear study data:', error);
  } finally {
    pool.end();
  }
}

clearStudyData();
