import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

let _jwtSecret: string | null = null;

function getJwtSecret(): string {
    if (!_jwtSecret) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('Missing JWT_SECRET environment variable');
        }
        _jwtSecret = secret;
    }
    return _jwtSecret;
}

export interface JWTPayload {
    userId: string;
    email: string;
}

/**
 * Sign a JWT token for a user
 */
export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, getJwtSecret()) as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Extract user from request (reads JWT from cookie or Authorization header)
 */
export function getUserFromRequest(req: NextRequest): JWTPayload | null {
    // Try cookie first
    const cookieToken = req.cookies.get('token')?.value;
    if (cookieToken) {
        return verifyToken(cookieToken);
    }

    // Try Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return verifyToken(authHeader.slice(7));
    }

    return null;
}
