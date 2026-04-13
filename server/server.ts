import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';

const app = express();
const port = 3000;

// Global Middleware
app.use(cors({
  // Default to Vite dev server in development
  origin: process.env.VITE_CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Load separated routes
import sessionMiddleware from './middleware/session';
import adminRoutes from './routes/admin';
import agentRoutes from './routes/agent';
import userRoutes from './routes/user';
import developerRoutes from './routes/developer';

// Route mount points
app.use('/api/admin', sessionMiddleware, adminRoutes);
app.use('/api/admin/agent', sessionMiddleware, agentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/developer', developerRoutes);

// Production: Serve the frontend
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(process.cwd(), 'client-dist');
  app.use(express.static(clientPath));

  // Catch-all route for React client-side routing
  // Using a regex prevents Path-to-RegExp errors in Express 5
  app.get(/^(?!\/(api|uploads)).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Start Server and Verify DB
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('FATAL: Database connection failed. Is the Docker container running?');
    console.error(err);
    process.exit(1);
  }

  console.log('Database connection successfully verified. Checking DB timestamp:', res.rows[0].now);

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
});
