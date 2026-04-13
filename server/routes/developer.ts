import express, { Request, Response } from 'express';
const router = express.Router();
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import pool from '../db';
import crypto from 'crypto';

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

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT name as category FROM categories WHERE enabled = true ORDER BY name');
    const categories = rows.map(r => r.category);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.fields([
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
      // Create with enabled = false for safety check
      const insertSetRes = await pool.query(
        'INSERT INTO sets (name, category, enabled) VALUES ($1, $2, false) RETURNING id',
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

    res.json({ success: true, message: 'Stimuli pair uploaded successfully and queued for review.' });
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

export default router;
