// @kairos/logger - Structured JSON logging to CloudWatch
// Lightweight logger optimized for Lambda cold starts

/** Log levels ordered by severity */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Numeric severity for log level comparison */
const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Context included in all log entries */
export interface LogContext {
  /** The authenticated user's member ID */
  userId?: string;
  /** The branch ID for the current operation */
  branchId?: string;
  /** The operation being performed (e.g., 'members-create') */
  operation?: string;
  /** Additional context fields */
  [key: string]: unknown;
}

/** Structured log entry written to CloudWatch */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  branchId?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Structured JSON logger for CloudWatch.
 * Includes context (userId, branchId, operation) in all log entries.
 * Supports log levels: debug, info, warn, error.
 */
export class Logger {
  private readonly service: string;
  private readonly minLevel: LogLevel;
  private context: LogContext;

  constructor(
    service: string,
    options: { minLevel?: LogLevel; context?: LogContext } = {}
  ) {
    this.service = service;
    this.minLevel = options.minLevel ?? getDefaultLogLevel();
    this.context = options.context ?? {};
  }

  /**
   * Sets persistent context fields that will be included in all subsequent log entries.
   * Useful for setting userId and branchId after auth context is extracted.
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Creates a child logger with additional context.
   * The child inherits the parent's context and adds its own.
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.service, {
      minLevel: this.minLevel,
      context: { ...this.context, ...context },
    });
    return childLogger;
  }

  /** Log a debug message (development/troubleshooting) */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /** Log an info message (normal operations) */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /** Log a warning message (potential issues) */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /** Log an error message (failures and exceptions) */
  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData['errorName'] = error.name;
      errorData['errorMessage'] = error.message;
      errorData['stack'] = error.stack;
    } else if (error !== undefined) {
      errorData['error'] = String(error);
    }

    this.log('error', message, errorData);
  }

  /**
   * Core logging method. Writes structured JSON to stdout/stderr
   * for CloudWatch to capture.
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    // Skip if below minimum log level
    if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...this.context,
      ...data,
    };

    // Use appropriate console method for CloudWatch log level filtering
    const output = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }
}

/**
 * Gets the default log level from the LOG_LEVEL environment variable.
 * Defaults to 'info' in production, 'debug' in development.
 */
function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_SEVERITY) {
    return envLevel as LogLevel;
  }
  return process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';
}

/**
 * Creates a new logger instance for a specific service/Lambda function.
 *
 * @param service - Service name (e.g., 'members-create', 'donations-webhook')
 * @param context - Optional initial context
 * @returns Logger instance
 */
export function createLogger(
  service: string,
  context?: LogContext
): Logger {
  return new Logger(service, { context });
}

/**
 * Default logger instance for general use.
 * For Lambda functions, prefer createLogger() with a specific service name.
 */
export const logger = new Logger('kairos');
