import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Validation check to ensure all DB variables are present
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`CRITICAL: Missing required environment variable for database: ${key}`);
  }
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT!, 10),
});

export default pool;
