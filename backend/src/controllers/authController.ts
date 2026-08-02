import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const result = await AuthService.login(email, password);
      await AuditService.log(result.admin.id, 'LOGIN', 'Admin', `Logged in from ${req.ip}`, req.ip);

      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Refresh token is required.' });
      }

      const payload = AuthService.verifyRefreshToken(refreshToken);
      const accessToken = AuthService.generateAccessToken({
        adminId: payload.adminId,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId
      });

      return res.json({ success: true, data: { accessToken } });
    } catch (err: any) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token.' });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return res.json({ success: true, data: req.user });
  }

  public static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.user) {
      await AuditService.log(req.user.adminId, 'LOGOUT', 'Admin', 'Logged out', req.ip);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  }
}
