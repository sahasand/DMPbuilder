import { Request, Response, NextFunction } from 'express';
import { logError } from './logger';
import { config } from '../core/config';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, true, 'VALIDATION_ERROR');
    if (details) {
      (this as any).details = details;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, true, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT');
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(500, message, false, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable') {
    super(503, message, false, 'SERVICE_UNAVAILABLE');
  }
}

// Clinical-specific errors
export class ClinicalValidationError extends ValidationError {
  constructor(message: string, field: string, value?: unknown) {
    super(message, { field, value });
  }
}

export class ComplianceError extends AppError {
  constructor(regulation: string, requirement: string) {
    super(
      422,
      `Compliance violation: ${regulation} - ${requirement}`,
      true,
      'COMPLIANCE_ERROR'
    );
  }
}

export class DataIntegrityError extends AppError {
  constructor(message: string) {
    super(422, `Data integrity error: ${message}`, true, 'DATA_INTEGRITY_ERROR');
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }
  
  let error: AppError;
  
  if (err instanceof AppError) {
    error = err;
  } else {
    // Convert unknown errors to AppError
    error = new InternalServerError(
      config.nodeEnv === 'development' ? err.message : 'Something went wrong'
    );
  }
  
  // Log error
  logError(`Error ${error.statusCode}: ${error.message}`, err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    code: error.code,
  });
  
  // Send error response
  const response: any = {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    },
  };
  
  // Include stack trace in development
  if (config.nodeEnv === 'development' && err.stack) {
    response.error.stack = err.stack;
  }
  
  // Include additional details if available
  if ((error as any).details) {
    response.error.details = (error as any).details;
  }
  
  res.status(error.statusCode).json(response);
};

// Async error wrapper for route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handling utilities
export const handleDatabaseError = (error: unknown): AppError => {
  if (error instanceof Error) {
    if (error.message.includes('duplicate')) {
      return new ConflictError('Resource already exists');
    }
    if (error.message.includes('constraint')) {
      return new ValidationError('Database constraint violation');
    }
  }
  return new InternalServerError('Database operation failed');
};

export const handleValidationError = (errors: Record<string, string[]>): ValidationError => {
  const message = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('; ');
  
  return new ValidationError(message, errors);
};

export const handleExternalAPIError = (error: unknown, service: string): AppError => {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new ServiceUnavailableError(`${service} service timeout: ${error.message}`);
    }
    if (error.message.includes('rate limit')) {
      return new ServiceUnavailableError(`${service} rate limit exceeded: ${error.message}`);
    }
    // Preserve the original error message for debugging
    return new ServiceUnavailableError(`${service} service error: ${error.message}`);
  }
  return new ServiceUnavailableError(`${service} service error: ${JSON.stringify(error)}`);
};