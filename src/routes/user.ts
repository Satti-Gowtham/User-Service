import express, { Request, Response } from 'express';
import * as db from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const result = await db.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [req.user.userId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: (error as Error).message });
  }
});

router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { username, email } = req.body;

  // Input validation
  if (!username || !email) {
    res.status(400).json({ message: 'Username and email are required' });
    return;
  }

  if (typeof username !== 'string' || typeof email !== 'string') {
    res.status(400).json({ message: 'Invalid input types' });
    return;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: 'Invalid email format' });
    return;
  }

  try {
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email',
      [username, email, req.user.userId]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile', error: (error as Error).message });
  }
});

export default router;