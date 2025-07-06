// Comprehensive Error Handling for Protocol Analyzer
import { createModuleLogger, logError, logWarning } from '../../../utils/logger';

const logger = createModuleLogger('protocol-analyzer-error-handler');

export enum AnalysisErrorCode {
  // Input validation errors
  INVALID_PROTOCOL = 'INVALID_PROTOCOL',
  INVALID_CRF = 'INVALID_CRF',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_STUDY_PHASE = 'INVALID_STUDY_PHASE',
  INVALID_ENDPOINT_DATA = 'INVALID_ENDPOINT_DATA',

  // Processing errors
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  CONCURRENT_ANALYSIS_LIMIT = 'CONCURRENT_ANALYSIS_LIMIT',
  ANALYZER_UNAVAILABLE = 'ANALYZER_UNAVAILABLE',

  // Data quality errors
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  INCONSISTENT_DATA = 'INCONSISTENT_DATA',
  OUTDATED_DATA = 'OUTDATED_DATA',

  // Risk assessment errors
  RISK_CALCULATION_FAILED = 'RISK_CALCULATION_FAILED',
  BENCHMARK_DATA_UNAVAILABLE = 'BENCHMARK_DATA_UNAVAILABLE',
  INVALID_RISK_PARAMETERS = 'INVALID_RISK_PARAMETERS',

  // Integration errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Report generation errors
  REPORT_TEMPLATE_ERROR = 'REPORT_TEMPLATE_ERROR',
  EXPORT_FAILED = 'EXPORT_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export interface AnalysisError extends Error {
  code: AnalysisErrorCode;
  category: 'Validation' | 'Processing' | 'DataQuality' | 'Integration' | 'System';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recoverable: boolean;
  context?: Record<string, any>;
  suggestion?: string;
  retryable?: boolean;
  retryDelay?: number; // milliseconds
}

export class ProtocolAnalysisError extends Error implements AnalysisError {
  public readonly code: AnalysisErrorCode;
  public readonly category: 'Validation' | 'Processing' | 'DataQuality' | 'Integration' | 'System';
  public readonly severity: 'Low' | 'Medium' | 'High' | 'Critical';
  public readonly recoverable: boolean;
  public readonly context?: Record<string, any>;
  public readonly suggestion?: string;
  public readonly retryable?: boolean;
  public readonly retryDelay?: number;

  constructor(
    code: AnalysisErrorCode,
    message: string,
    options: {
      category?: 'Validation' | 'Processing' | 'DataQuality' | 'Integration' | 'System';
      severity?: 'Low' | 'Medium' | 'High' | 'Critical';
      recoverable?: boolean;
      context?: Record<string, any>;
      suggestion?: string;
      retryable?: boolean;
      retryDelay?: number;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ProtocolAnalysisError';
    this.code = code;
    this.category = options.category || this.inferCategory(code);
    this.severity = options.severity || this.inferSeverity(code);
    this.recoverable = options.recoverable ?? this.inferRecoverability(code);
    this.context = options.context;
    this.suggestion = options.suggestion || this.generateSuggestion(code);
    this.retryable = options.retryable ?? this.inferRetryability(code);
    this.retryDelay = options.retryDelay;
    
    if (options.cause) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  private inferCategory(code: AnalysisErrorCode): 'Validation' | 'Processing' | 'DataQuality' | 'Integration' | 'System' {
    if ([
      AnalysisErrorCode.INVALID_PROTOCOL,
      AnalysisErrorCode.INVALID_CRF,
      AnalysisErrorCode.MISSING_REQUIRED_FIELD,
      AnalysisErrorCode.INVALID_STUDY_PHASE,
      AnalysisErrorCode.INVALID_ENDPOINT_DATA
    ].includes(code)) {
      return 'Validation';
    }

    if ([
      AnalysisErrorCode.INSUFFICIENT_DATA,
      AnalysisErrorCode.CORRUPTED_DATA,
      AnalysisErrorCode.INCONSISTENT_DATA,
      AnalysisErrorCode.OUTDATED_DATA
    ].includes(code)) {
      return 'DataQuality';
    }

    if ([
      AnalysisErrorCode.AI_SERVICE_ERROR,
      AnalysisErrorCode.DATABASE_CONNECTION_ERROR,
      AnalysisErrorCode.EXTERNAL_API_ERROR
    ].includes(code)) {
      return 'Integration';
    }

    if ([
      AnalysisErrorCode.ANALYSIS_TIMEOUT,
      AnalysisErrorCode.MEMORY_LIMIT_EXCEEDED,
      AnalysisErrorCode.CONCURRENT_ANALYSIS_LIMIT,
      AnalysisErrorCode.CONFIGURATION_ERROR
    ].includes(code)) {
      return 'System';
    }

    return 'Processing';
  }

  private inferSeverity(code: AnalysisErrorCode): 'Low' | 'Medium' | 'High' | 'Critical' {
    const criticalErrors = [
      AnalysisErrorCode.MEMORY_LIMIT_EXCEEDED,
      AnalysisErrorCode.CORRUPTED_DATA,
      AnalysisErrorCode.DATABASE_CONNECTION_ERROR
    ];

    const highErrors = [
      AnalysisErrorCode.INVALID_PROTOCOL,
      AnalysisErrorCode.ANALYSIS_TIMEOUT,
      AnalysisErrorCode.INSUFFICIENT_DATA,
      AnalysisErrorCode.RISK_CALCULATION_FAILED
    ];

    const mediumErrors = [
      AnalysisErrorCode.INVALID_CRF,
      AnalysisErrorCode.INCONSISTENT_DATA,
      AnalysisErrorCode.AI_SERVICE_ERROR,
      AnalysisErrorCode.EXPORT_FAILED
    ];

    if (criticalErrors.includes(code)) return 'Critical';
    if (highErrors.includes(code)) return 'High';
    if (mediumErrors.includes(code)) return 'Medium';
    return 'Low';
  }

  private inferRecoverability(code: AnalysisErrorCode): boolean {
    const unrecoverableErrors = [
      AnalysisErrorCode.CORRUPTED_DATA,
      AnalysisErrorCode.INVALID_PROTOCOL,
      AnalysisErrorCode.PERMISSION_DENIED
    ];
    return !unrecoverableErrors.includes(code);
  }

  private inferRetryability(code: AnalysisErrorCode): boolean {
    const retryableErrors = [
      AnalysisErrorCode.ANALYSIS_TIMEOUT,
      AnalysisErrorCode.AI_SERVICE_ERROR,
      AnalysisErrorCode.DATABASE_CONNECTION_ERROR,
      AnalysisErrorCode.EXTERNAL_API_ERROR,
      AnalysisErrorCode.ANALYZER_UNAVAILABLE
    ];
    return retryableErrors.includes(code);
  }

  private generateSuggestion(code: AnalysisErrorCode): string {
    const suggestions: Record<AnalysisErrorCode, string> = {
      [AnalysisErrorCode.INVALID_PROTOCOL]: 'Verify protocol data completeness and format. Check required fields like studyTitle, protocolNumber, and studyPhase.',
      [AnalysisErrorCode.INVALID_CRF]: 'Ensure CRF specifications include valid field definitions and types.',
      [AnalysisErrorCode.MISSING_REQUIRED_FIELD]: 'Check protocol data for all required fields and provide complete information.',
      [AnalysisErrorCode.INVALID_STUDY_PHASE]: 'Study phase must be one of: 1, 2, 3, 4, or N/A for observational studies.',
      [AnalysisErrorCode.INVALID_ENDPOINT_DATA]: 'Verify endpoint definitions are complete and follow clinical trial standards.',
      [AnalysisErrorCode.ANALYSIS_TIMEOUT]: 'Try reducing analysis scope or simplifying protocol data. Consider running analysis in smaller batches.',
      [AnalysisErrorCode.MEMORY_LIMIT_EXCEEDED]: 'Reduce data size or complexity. Consider analyzing components separately.',
      [AnalysisErrorCode.CONCURRENT_ANALYSIS_LIMIT]: 'Wait for other analyses to complete before starting new ones.',
      [AnalysisErrorCode.ANALYZER_UNAVAILABLE]: 'Check analyzer service status and retry. Contact support if problem persists.',
      [AnalysisErrorCode.INSUFFICIENT_DATA]: 'Provide more complete protocol information for accurate analysis.',
      [AnalysisErrorCode.CORRUPTED_DATA]: 'Re-upload protocol data from original source. Verify file integrity.',
      [AnalysisErrorCode.INCONSISTENT_DATA]: 'Review protocol data for internal consistency. Check for conflicting information.',
      [AnalysisErrorCode.OUTDATED_DATA]: 'Update protocol data to current version. Verify information is up-to-date.',
      [AnalysisErrorCode.RISK_CALCULATION_FAILED]: 'Check risk assessment parameters and input data quality.',
      [AnalysisErrorCode.BENCHMARK_DATA_UNAVAILABLE]: 'Industry benchmark data is temporarily unavailable. Analysis will use default values.',
      [AnalysisErrorCode.INVALID_RISK_PARAMETERS]: 'Verify risk assessment configuration and parameters.',
      [AnalysisErrorCode.AI_SERVICE_ERROR]: 'AI analysis service is temporarily unavailable. Please retry.',
      [AnalysisErrorCode.DATABASE_CONNECTION_ERROR]: 'Database connection failed. Check network connectivity.',
      [AnalysisErrorCode.EXTERNAL_API_ERROR]: 'External service integration failed. Check service status and configuration.',
      [AnalysisErrorCode.CONFIGURATION_ERROR]: 'Check analyzer configuration settings and contact administrator if needed.',
      [AnalysisErrorCode.REPORT_TEMPLATE_ERROR]: 'Report template is corrupted or missing. Contact support.',
      [AnalysisErrorCode.EXPORT_FAILED]: 'Report export failed. Check permissions and try again.',
      [AnalysisErrorCode.PERMISSION_DENIED]: 'Insufficient permissions for requested operation. Contact administrator.'
    };

    return suggestions[code] || 'Please contact support if the problem persists.';
  }
}

export class ErrorHandler {
  private errorCounts: Map<AnalysisErrorCode, number> = new Map();
  private lastErrors: Map<AnalysisErrorCode, Date> = new Map();
  private readonly maxRetries = 3;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerWindow = 300000; // 5 minutes

  /**
   * Handle and process analysis errors
   */
  handleError(error: unknown, context?: Record<string, any>): AnalysisError {
    let analysisError: AnalysisError;

    if (error instanceof ProtocolAnalysisError) {
      analysisError = error;
    } else if (error instanceof Error) {
      analysisError = this.convertToAnalysisError(error, context);
    } else {
      analysisError = new ProtocolAnalysisError(
        AnalysisErrorCode.ANALYZER_UNAVAILABLE,
        'Unknown error occurred during analysis',
        { context: { originalError: String(error), ...context } }
      );
    }

    // Update error tracking
    this.trackError(analysisError);

    // Log error with appropriate level
    this.logError(analysisError);

    // Check circuit breaker
    if (this.shouldTriggerCircuitBreaker(analysisError.code)) {
      logWarning('Circuit breaker triggered for repeated errors', {
        errorCode: analysisError.code,
        count: this.errorCounts.get(analysisError.code)
      });
    }

    return analysisError;
  }

  /**
   * Determine if operation should be retried
   */
  shouldRetry(error: AnalysisError, attemptCount: number): boolean {
    if (!error.retryable || attemptCount >= this.maxRetries) {
      return false;
    }

    // Check circuit breaker
    if (this.shouldTriggerCircuitBreaker(error.code)) {
      return false;
    }

    return true;
  }

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: AnalysisError, attemptCount: number): number {
    if (error.retryDelay) {
      return error.retryDelay;
    }

    // Exponential backoff
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(2, attemptCount - 1);
  }

  /**
   * Create recovery suggestions based on error
   */
  createRecoveryPlan(error: AnalysisError): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const plans = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    switch (error.category) {
      case 'Validation':
        plans.immediate.push('Review and correct input data');
        plans.shortTerm.push('Implement data validation checks');
        plans.longTerm.push('Create data quality framework');
        break;

      case 'Processing':
        plans.immediate.push('Retry with reduced scope');
        plans.shortTerm.push('Optimize processing pipeline');
        plans.longTerm.push('Scale infrastructure capacity');
        break;

      case 'DataQuality':
        plans.immediate.push('Clean and validate data');
        plans.shortTerm.push('Implement data quality monitoring');
        plans.longTerm.push('Establish data governance processes');
        break;

      case 'Integration':
        plans.immediate.push('Check service status and connectivity');
        plans.shortTerm.push('Implement service health monitoring');
        plans.longTerm.push('Design resilient integration patterns');
        break;

      case 'System':
        plans.immediate.push('Check system resources and configuration');
        plans.shortTerm.push('Monitor system performance');
        plans.longTerm.push('Plan capacity and infrastructure upgrades');
        break;
    }

    return plans;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCode: Map<AnalysisErrorCode, number>;
    errorsByCategory: Map<string, number>;
    errorsBySeverity: Map<string, number>;
    recentErrors: Array<{ code: AnalysisErrorCode; timestamp: Date }>;
  } {
    const errorsByCategory = new Map<string, number>();
    const errorsBySeverity = new Map<string, number>();
    const recentErrors: Array<{ code: AnalysisErrorCode; timestamp: Date }> = [];

    // Process error counts
    for (const [code, count] of this.errorCounts.entries()) {
      const error = new ProtocolAnalysisError(code, '');
      
      // Count by category
      const categoryCount = errorsByCategory.get(error.category) || 0;
      errorsByCategory.set(error.category, categoryCount + count);
      
      // Count by severity
      const severityCount = errorsBySeverity.get(error.severity) || 0;
      errorsBySeverity.set(error.severity, severityCount + count);
      
      // Recent errors
      const lastOccurrence = this.lastErrors.get(code);
      if (lastOccurrence && Date.now() - lastOccurrence.getTime() < 3600000) { // Last hour
        recentErrors.push({ code, timestamp: lastOccurrence });
      }
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCode: new Map(this.errorCounts),
      errorsByCategory,
      errorsBySeverity,
      recentErrors: recentErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    };
  }

  /**
   * Reset error tracking
   */
  resetErrorTracking(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Private helper methods
   */
  private convertToAnalysisError(error: Error, context?: Record<string, any>): AnalysisError {
    // Map common errors to analysis error codes
    if (error.message.includes('timeout')) {
      return new ProtocolAnalysisError(
        AnalysisErrorCode.ANALYSIS_TIMEOUT,
        'Analysis operation timed out',
        { context, cause: error, retryable: true, retryDelay: 5000 }
      );
    }

    if (error.message.includes('memory') || error.message.includes('heap')) {
      return new ProtocolAnalysisError(
        AnalysisErrorCode.MEMORY_LIMIT_EXCEEDED,
        'Memory limit exceeded during analysis',
        { context, cause: error, severity: 'Critical' }
      );
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ProtocolAnalysisError(
        AnalysisErrorCode.INVALID_PROTOCOL,
        'Protocol validation failed',
        { context, cause: error }
      );
    }

    if (error.message.includes('network') || error.message.includes('connection')) {
      return new ProtocolAnalysisError(
        AnalysisErrorCode.EXTERNAL_API_ERROR,
        'Network or connection error',
        { context, cause: error, retryable: true, retryDelay: 2000 }
      );
    }

    // Default error mapping
    return new ProtocolAnalysisError(
      AnalysisErrorCode.ANALYZER_UNAVAILABLE,
      error.message || 'Unknown analysis error',
      { context, cause: error }
    );
  }

  private trackError(error: AnalysisError): void {
    const currentCount = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, currentCount + 1);
    this.lastErrors.set(error.code, new Date());
  }

  private logError(error: AnalysisError): void {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
      context: error.context
    };

    if (error.severity === 'Critical' || error.severity === 'High') {
      logError(error.message, error, logData);
    } else {
      logWarning(error.message, logData);
    }
  }

  private shouldTriggerCircuitBreaker(code: AnalysisErrorCode): boolean {
    const count = this.errorCounts.get(code) || 0;
    const lastOccurrence = this.lastErrors.get(code);
    
    if (!lastOccurrence) return false;
    
    const withinWindow = Date.now() - lastOccurrence.getTime() < this.circuitBreakerWindow;
    return count >= this.circuitBreakerThreshold && withinWindow;
  }
}

// Utility functions for common error scenarios
export function createValidationError(field: string, value: any, expected: string): ProtocolAnalysisError {
  return new ProtocolAnalysisError(
    AnalysisErrorCode.MISSING_REQUIRED_FIELD,
    `Invalid value for field '${field}': expected ${expected}, got ${typeof value}`,
    {
      context: { field, value, expected },
      suggestion: `Provide a valid ${expected} value for ${field}`
    }
  );
}

export function createTimeoutError(operation: string, timeoutMs: number): ProtocolAnalysisError {
  return new ProtocolAnalysisError(
    AnalysisErrorCode.ANALYSIS_TIMEOUT,
    `Operation '${operation}' timed out after ${timeoutMs}ms`,
    {
      context: { operation, timeoutMs },
      retryable: true,
      retryDelay: Math.min(timeoutMs * 0.5, 10000) // Half timeout, max 10s
    }
  );
}

export function createDataQualityError(issue: string, data: any): ProtocolAnalysisError {
  return new ProtocolAnalysisError(
    AnalysisErrorCode.INCONSISTENT_DATA,
    `Data quality issue: ${issue}`,
    {
      context: { issue, data: JSON.stringify(data).substring(0, 200) },
      severity: 'Medium'
    }
  );
}

// Export singleton instance
export const errorHandler = new ErrorHandler();