import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Acceso reservado a administradores" });
    return;
  }
  next();
};
