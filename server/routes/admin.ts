import express, { Request, Response } from 'express';
const router = express.Router();
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import passport from 'passport';
import pool from '../db';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/auth';

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString('hex');
    cb(null, hash + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Auth Endpoints
router.post('/login', passport.authenticate('local'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged in successfully', user: req.user });
});

router.post('/logout', (req: Request, res: Response, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Admin Upload Stimulus Endpoint
router.post('/stimulus/upload', requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file provided' });
  }

  const { set_name, is_deceptive, name, category } = req.body;
  const image_url = `/uploads/${req.file.filename}`;

  try {
    let setRes = await pool.query('SELECT id FROM sets WHERE name = $1', [set_name]);
    let set_id;
    if (setRes.rows.length > 0) {
      set_id = setRes.rows[0].id;
    } else {
      const insertSetRes = await pool.query(
        'INSERT INTO sets (name, category) VALUES ($1, $2) RETURNING id',
        [set_name, category]
      );
      set_id = insertSetRes.rows[0].id;
    }

    const stimulusRes = await pool.query(
      'INSERT INTO stimuli (image_url, set_id, is_deceptive, name) VALUES ($1, $2, $3, $4) RETURNING id',
      [image_url, set_id, is_deceptive === 'true' || is_deceptive === true, name]
    );

    res.json({ success: true, stimulus_id: stimulusRes.rows[0].id, image_url });
  } catch (error) {
    console.error('Database insertion failed. Rolling back uploaded file... ', error);
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Failed to delete orphaned image: ', err);
    });
    res.status(500).json({ success: false, error: 'Failed to upload stimulus and associate with DB' });
  }
});

// Admin Upload Stimulus Pair (New)
router.post('/stimulus/upload-pair', requireAdmin, upload.fields([
  { name: 'honest_image', maxCount: 1 },
  { name: 'deceptive_image', maxCount: 1 }
]), async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files || !files['honest_image'] || !files['deceptive_image']) {
    return res.status(400).json({ success: false, error: 'Both honest and deceptive images must be provided' });
  }

  const honestFile = files['honest_image'][0];
  const deceptiveFile = files['deceptive_image'][0];
  const { set_name, category } = req.body;

  if (!set_name) {
    fs.unlink(honestFile.path, () => {});
    fs.unlink(deceptiveFile.path, () => {});
    return res.status(400).json({ success: false, error: 'Set name is required' });
  }

  const honestUrl = `/uploads/${honestFile.filename}`;
  const deceptiveUrl = `/uploads/${deceptiveFile.filename}`;

  try {
    let setRes = await pool.query('SELECT id FROM sets WHERE name = $1', [set_name]);
    let set_id;
    if (setRes.rows.length > 0) {
      set_id = setRes.rows[0].id;
    } else {
      const insertSetRes = await pool.query(
        'INSERT INTO sets (name, category, enabled) VALUES ($1, $2, true) RETURNING id',
        [set_name, category]
      );
      set_id = insertSetRes.rows[0].id;
    }

    // Insert both stimuli using original file names (stripped of extension)
    await pool.query(
      'INSERT INTO stimuli (image_url, set_id, is_deceptive, name) VALUES ($1, $2, false, $3)',
      [honestUrl, set_id, honestFile.originalname.split('.')[0]]
    );
    await pool.query(
      'INSERT INTO stimuli (image_url, set_id, is_deceptive, name) VALUES ($1, $2, true, $3)',
      [deceptiveUrl, set_id, deceptiveFile.originalname.split('.')[0]]
    );

    res.json({ success: true, message: 'Stimuli pair uploaded successfully!' });
  } catch (error: any) {
    console.error('Database insertion failed. Rolling back uploaded files... ', error);
    fs.unlink(honestFile.path, (err) => {
      if (err) console.error('Failed to delete honest image: ', err);
    });
    fs.unlink(deceptiveFile.path, (err) => {
      if (err) console.error('Failed to delete deceptive image: ', err);
    });
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'Invalid Category selected.' });
    }
    res.status(500).json({ success: false, error: 'Failed to upload stimuli pair' });
  }
});

// ADMIN DASHBOARD DATA ENDPOINTS
router.get('/me', requireAdmin, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

router.get('/sets', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sets');
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/sets/:setId/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    await pool.query('UPDATE sets SET enabled = $1 WHERE id = $2', [enabled, req.params.setId]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/stimuli/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stimulusRes = await pool.query('SELECT image_url FROM stimuli WHERE id = $1', [req.params.id]);
    if (stimulusRes.rows.length === 0) return res.status(404).json({ error: 'Stimulus not found' });

    await pool.query('DELETE FROM stimuli WHERE id = $1', [req.params.id]);

    const imageUrl = stimulusRes.rows[0].image_url;
    if (imageUrl.startsWith('/uploads/')) {
      const filename = imageUrl.split('/').pop();
      if (filename) {
        fs.unlink(path.join(process.cwd(), 'uploads', filename), (err) => {
          if (err) console.error('Failed to cleanup image on fs:', err);
        });
      }
    }
    
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/stimuli', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT st.*, s.name as set_name, s.category as set_category, s.enabled as set_enabled
      FROM stimuli st
      JOIN sets s ON st.set_id = s.id
    `);
    
    const mapped = rows.map(r => ({
      ...r,
      sets: { name: r.set_name, category: r.set_category, enabled: r.set_enabled }
    }));
    
    res.json(mapped);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/participants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM participants ORDER BY created_at DESC');
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/data/pair-stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pair_stats');
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/data/responses', requireAdmin, async (req: Request, res: Response) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = isAll ? 1000000 : 50;
    const offset = (page - 1) * limit;

    const query = `
      SELECT r.*,
             s.name as set_name,
             l.name as left_stimulus_name,
             rt.name as right_stimulus_name,
             sel.name as selected_stimulus_name
      FROM responses r
      LEFT JOIN sets s ON r.set_id = s.id
      LEFT JOIN stimuli l ON r.left_stimulus = l.id
      LEFT JOIN stimuli rt ON r.right_stimulus = rt.id
      LEFT JOIN stimuli sel ON r.selected_stimulus = sel.id
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(query, [limit, offset]);
    
    const countRes = await pool.query('SELECT COUNT(*) FROM responses');

    const mapped = rows.map(r => ({
      ...r,
      sets: { name: r.set_name },
      left_stim: { name: r.left_stimulus_name },
      right_stim: { name: r.right_stimulus_name },
      selected_stim: { name: r.selected_stimulus_name }
    }));
    
    res.json({ results: mapped, count: parseInt(countRes.rows[0].count) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    await pool.query('INSERT INTO categories (name) VALUES ($1)', [name]);
    res.json({ success: true, category: { name, enabled: true } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/categories/:name', requireAdmin, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM categories WHERE name = $1', [req.params.name]);
    res.json({ success: true });
  } catch (err: any) { 
    if (err.code === '23503') { // Foreign Key Violation
      res.status(400).json({ error: 'Cannot delete: Category is actively being used by one or more Stimuli Sets.'});
    } else {
      res.status(500).json({ error: err.message }); 
    }
  }
});

export default router;
