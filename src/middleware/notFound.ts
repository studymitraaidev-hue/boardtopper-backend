import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export function notFound(req: Request, res: Response): void {
  ApiResponse.error(res, 'Route not found', 404);
}
