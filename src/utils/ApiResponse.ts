import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, status = 200): void {
    res.status(status).json({ data, error: null });
  }

  static error(res: Response, message: string, status = 500): void {
    res.status(status).json({ data: null, error: message });
  }
}
