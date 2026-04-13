import 'express';

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      [key: string]: any;
    }

    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}
