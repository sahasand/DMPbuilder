// Platform Logging Service Implementation

import { LoggingService } from '../../types/platform-types';

export class PlatformLoggingService implements LoggingService {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  async initialize?(): Promise<void> {
    console.log('[platform-logging-service] Platform logging service initialized');
  }

  async shutdown?(): Promise<void> {
    console.log('[platform-logging-service] Platform logging service shutdown');
  }

  info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] INFO: ${message}${contextStr}`);
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      console.warn(`[${timestamp}] WARN: ${message}${contextStr}`);
    }
  }

  error(message: string, error?: Error, context?: any): void {
    if (this.shouldLog('error')) {
      const timestamp = new Date().toISOString();
      const errorStr = error ? ` | Error: ${error.message}` : '';
      const stackStr = error?.stack ? ` | Stack: ${error.stack}` : '';
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      console.error(`[${timestamp}] ERROR: ${message}${errorStr}${stackStr}${contextStr}`);
    }
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      console.debug(`[${timestamp}] DEBUG: ${message}${contextStr}`);
    }
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
    this.info(`Log level set to: ${level}`);
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      logLevel: this.logLevel
    };
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}