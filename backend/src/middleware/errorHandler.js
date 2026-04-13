import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso', id = null) {
    super(id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos invalidos', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tenes permisos para esta accion') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto con recurso existente') {
    super(message, 409, 'CONFLICT');
  }
}

export const errorHandler = (err, req, res, next) => {
  const errorId = uuidv4();

  if (!err.isOperational) {
    logger.error('Error inesperado', { errorId, message: err.message, stack: err.stack });
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: {
      id: errorId,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
