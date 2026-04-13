import express, { Request, Response } from 'express';
const router = express.Router();
import pool from '../db';
import { requireAdmin } from '../middleware/auth';

// Admin Create AI Participant Endpoint
router.post('/ai-participant', requireAdmin, async (req: Request, res: Response) => {
  const { category, demographics } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO participants (is_ai, category, demographics) VALUES ($1, $2, $3) RETURNING id',
      [true, category, demographics]
    );

    res.json({ success: true, participant_id: result.rows[0].id });
  } catch (error) {
    console.error('Failed to create AI participant via express controller:', error);
    res.status(500).json({ success: false, error: 'Failed to create AI participant' });
  }
});

export default router;
