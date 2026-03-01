import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

// ── Payload shape stored in every JWT ───────────────────────────────────────
export interface AuthUser {
  userId: number;
  email:  string;
  name:   string;
  role:   Role;
}

// Extend Express's Request so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ── requireAuth ──────────────────────────────────────────────────────────────
// Attaches req.user or returns 401. Mount before any protected route group.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── requireRole ──────────────────────────────────────────────────────────────
// Factory — use after requireAuth. Example: requireRole('ADMIN')
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
