import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../core/config';

// Ensure log directory exists
const ensureLogDirectory = (): void => {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
};

ensureLogDirectory();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: config.appName },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logDir, 'app.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Add file transport for production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join(config.logDir, 'production.log'),
      maxsize: 52428800, // 50MB
      maxFiles: 10,
      tailable: true,
    })
  );
}

// Create specialized loggers for different modules
export const createModuleLogger = (moduleName: string): winston.Logger => {
  return logger.child({ module: moduleName });
};

// Clinical audit logger for regulatory compliance
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(config.logDir, 'audit.log'),
      maxsize: 104857600, // 100MB
      maxFiles: 20,
      tailable: true,
    }),
  ],
});

// Performance logger
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(config.logDir, 'performance.log'),
      maxsize: 52428800, // 50MB
      maxFiles: 5,
    }),
  ],
});

// Helper functions for structured logging
export const logInfo = (message: string, metadata?: Record<string, unknown>): void => {
  logger.info(message, metadata);
};

export const logError = (message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void => {
  const errorData = error instanceof Error 
    ? { error: error.message, stack: error.stack }
    : { error: String(error) };
  
  logger.error(message, { ...errorData, ...metadata });
};

export const logWarn = (message: string, metadata?: Record<string, unknown>): void => {
  logger.warn(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, unknown>): void => {
  logger.debug(message, metadata);
};

// Audit logging functions for clinical compliance
export const logAuditEvent = (
  event: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
): void => {
  auditLogger.info({
    event,
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Performance logging functions
export const logPerformance = (
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, unknown>
): void => {
  performanceLogger.info({
    operation,
    duration,
    success,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Measure and log operation performance
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const start = Date.now();
  let success = false;
  
  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const duration = Date.now() - start;
    logPerformance(operation, duration, success, metadata);
  }
};

export default logger;