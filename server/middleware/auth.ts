import { Request, Response, NextFunction } from 'express';

/**
 * Checks if the user is authenticated as an admin.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Function to call if authenticated
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized: Admin access required' });
};

/**
 * Checks if a user request has a session id in its headers.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Function to call if header exists
 */
export const requireParticipant = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing X-Session-ID header' });
  }
  req.sessionId = sessionId;
  next();
};
