import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "Token mal formado" });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret",
    ) as { userId: number; role?: string };

    req.userId = decoded.userId;
    req.userRole = decoded.role || "USER";
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
};
