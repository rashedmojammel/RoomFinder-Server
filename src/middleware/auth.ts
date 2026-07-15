import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL;

if (!AUTH_SERVER_URL) {
  throw new Error("Missing required environment variable: AUTH_SERVER_URL");
}

// Fetched once, cached, and auto-refreshed by jose as keys rotate
const JWKS = createRemoteJWKSet(new URL(`${AUTH_SERVER_URL}/api/auth/jwks`));

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  userRole: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function verifyToken(authHeader: string | undefined): Promise<AuthUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_SERVER_URL,
    });

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      userRole: (payload.userRole as string) ?? "tenant",
    };
  } catch {
    return null;
  }
}

// Attaches req.user if a valid token is present; does NOT block the request otherwise
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  req.user = (await verifyToken(req.headers.authorization)) ?? undefined;
  next();
}

// Blocks the request entirely unless a valid token is present
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await verifyToken(req.headers.authorization);

  if (!user) {
    res.status(401).json({ error: { message: "Authentication required", code: "UNAUTHENTICATED" } });
    return;
  }

  req.user = user;
  next();
}

// Blocks unless the authenticated user's role is in the allowed list
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: { message: "Authentication required", code: "UNAUTHENTICATED" } });
      return;
    }
    if (!roles.includes(req.user.userRole)) {
      res.status(403).json({ error: { message: "Insufficient permissions", code: "FORBIDDEN" } });
      return;
    }
    next();
  };
}