import { Request, Response, NextFunction } from 'express';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err.message);

  res.status(500).json({
    error: 'No se pudo completar la operación. Inténtalo de nuevo.'
  });
};
