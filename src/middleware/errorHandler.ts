import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import logger from '../utils/logger';

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  name: string;
  code?: string | number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  if (isDevelopment) {
    logger.error(`${err.name}: ${err.message}\n${err.stack ?? ''}`);
  } else {
    logger.error(`${err.name}: ${err.message}`);
  }

  // JWT errors → 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    ApiResponse.error(res, 'Unauthorized', 401);
    return;
  }

  // Validation errors → 400
  if (err.name === 'ValidationError') {
    ApiResponse.error(res, err.message, 400);
    return;
  }

  // Duplicate key errors → 409
  if (err.code === 11000 || err.code === '23505') {
    ApiResponse.error(res, 'Resource already exists', 409);
    return;
  }

  // Cast errors (e.g. invalid ObjectId) → 400
  if (err.name === 'CastError') {
    ApiResponse.error(res, 'Invalid request data', 400);
    return;
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';

  ApiResponse.error(res, message, status);
}
