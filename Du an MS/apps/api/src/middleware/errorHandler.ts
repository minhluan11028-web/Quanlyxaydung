import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'Conflict',
        message: 'Resource already exists',
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'Not Found',
        message: 'Resource not found',
      });
      return;
    }

    if (prismaError.code === 'P2003') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Foreign key constraint failed',
      });
      return;
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired',
    });
    return;
  }

  // Custom app errors
  if ((error as AppError).statusCode) {
    const appError = error as AppError;
    res.status(appError.statusCode).json({
      error: appError.name,
      message: appError.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
