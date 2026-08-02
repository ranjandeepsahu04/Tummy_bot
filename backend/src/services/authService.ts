import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
export interface TokenPayload {
  adminId: string;
  email: string;
  role: string;
  restaurantId?: string | null;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  }

  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }

  public static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  }

  public static async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
      include: { restaurant: true }
    });

    if (!admin || !admin.isEnabled) {
      throw new Error('Invalid email or account is disabled.');
    }

    const isValid = await this.comparePassword(password, admin.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const payload: TokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      restaurantId: admin.restaurantId
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        restaurantId: admin.restaurantId,
        restaurantName: admin.restaurant?.name
      }
    };
  }
}
