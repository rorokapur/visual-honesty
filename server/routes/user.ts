import express, { Request, Response } from 'express';
import pool from '../db';
import { requireParticipant } from '../middleware/auth';
const router = express.Router();

// --- Participant Management ---

// Create new participant
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, demographics = {} } = req.body || {};

    if (category !== 'human' && category !== 'ai') {
      return res.status(400).json({ error: "Invalid session category, must be 'ai' or 'human'" });
    }

    if (category === 'human' && demographics?.agreed_to_consent !== true) {
      return res.status(403).json({ error: "IRB Consent is required for human trials." });
    }

    const { rows } = await pool.query('SELECT create_participant($1, $2) AS data', [category, demographics]);
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Validate session
router.get('/validate', requireParticipant, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT is_valid_participant($1) AS data', [req.sessionId]);
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get participant results summary (upsert pattern)
router.get('/results/summary', requireParticipant, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT get_participant_results($1) AS data', [req.sessionId]);
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get categorical results
router.get('/results/categories', requireParticipant, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT get_participant_category_comparison($1) AS data', [req.sessionId]);
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// General results benchmarks
router.get('/results/benchmarks', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT get_binned_benchmarks() AS data');
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- Trial Presentation ---

router.get('/trial/next', requireParticipant, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT get_random_unseen_trial($1) AS data', [req.sessionId]);
    res.set('Vary', 'X-Session-ID'); // Inform caches that the response varies by session ID
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/trial/submit', requireParticipant, async (req: Request, res: Response) => {
  try {
    const { trialId, choice, verdict, frontendTime } = req.body;
    if (!trialId || !frontendTime) return res.status(400).json({ error: "Missing required fields" });
    const { rows } = await pool.query('SELECT submit_response($1, $2, $3, $4, $5) AS data',
      [req.sessionId, trialId, choice ?? null, verdict ?? null, frontendTime]);
    res.json(rows[0].data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
