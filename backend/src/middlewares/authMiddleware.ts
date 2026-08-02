import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Missing authentication token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden. Insufficient role permissions.' });
    }

    next();
  };
}
