import { appConfig } from "@/lib/config/app";

// Error types for better categorization
export enum ErrorType {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  PERMISSION = "PERMISSION",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
  CLIENT = "CLIENT",
  UNKNOWN = "UNKNOWN",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;
  public readonly timestamp: Date;

  constructor({
    message,
    type = ErrorType.UNKNOWN,
    severity = ErrorSeverity.MEDIUM,
    code,
    context,
    userMessage,
    cause,
  }: {
    message: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    code?: string;
    context?: Record<string, any>;
    userMessage?: string;
    cause?: Error;
  }) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.context = context;
    this.userMessage = userMessage;
    this.timestamp = new Date();

    if (cause) {
      this.cause = cause;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      context: this.context,
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

// User-friendly error messages
const USER_FRIENDLY_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: "Network connection issue. Please check your internet and try again.",
  [ErrorType.AUTHENTICATION]: "Authentication failed. Please sign in again.",
  [ErrorType.VALIDATION]: "Please check your input and try again.",
  [ErrorType.PERMISSION]: "You don't have permission to perform this action.",
  [ErrorType.NOT_FOUND]: "The requested resource was not found.",
  [ErrorType.RATE_LIMIT]: "Too many requests. Please wait a moment and try again.",
  [ErrorType.SERVER]: "Server error occurred. Please try again later.",
  [ErrorType.CLIENT]: "Something went wrong. Please refresh and try again.",
  [ErrorType.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

// Error classification helpers
export function classifyError(error: unknown): {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
} {
  if (error instanceof AppError) {
    return {
      type: error.type,
      severity: error.severity,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("offline")
    ) {
      return { type: ErrorType.NETWORK, severity: ErrorSeverity.MEDIUM };
    }

    // Authentication errors
    if (
      error.message.includes("unauthorized") ||
      error.message.includes("authentication") ||
      error.message.includes("token")
    ) {
      return { type: ErrorType.AUTHENTICATION, severity: ErrorSeverity.HIGH };
    }

    // Validation errors
    if (
      error.message.includes("validation") ||
      error.message.includes("invalid") ||
      error.message.includes("required")
    ) {
      return { type: ErrorType.VALIDATION, severity: ErrorSeverity.LOW };
    }
  }

  // Check for HTTP errors
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as any).status;
    if (status === 401 || status === 403) {
      return { type: ErrorType.AUTHENTICATION, severity: ErrorSeverity.HIGH };
    }
    if (status === 404) {
      return { type: ErrorType.NOT_FOUND, severity: ErrorSeverity.LOW };
    }
    if (status === 429) {
      return { type: ErrorType.RATE_LIMIT, severity: ErrorSeverity.MEDIUM };
    }
    if (status >= 500) {
      return { type: ErrorType.SERVER, severity: ErrorSeverity.HIGH };
    }
    if (status >= 400) {
      return { type: ErrorType.CLIENT, severity: ErrorSeverity.MEDIUM };
    }
  }

  return { type: ErrorType.UNKNOWN, severity: ErrorSeverity.MEDIUM };
}

// Create standardized error
export function createError({
  error,
  message,
  type,
  severity,
  code,
  context,
  userMessage,
}: {
  error?: unknown;
  message?: string;
  type?: ErrorType;
  severity?: ErrorSeverity;
  code?: string;
  context?: Record<string, any>;
  userMessage?: string;
}): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const classification = classifyError(error);
  const errorMessage = message || (error instanceof Error ? error.message : "Unknown error");

  return new AppError({
    message: errorMessage,
    type: type || classification.type,
    severity: severity || classification.severity,
    code: code || classification.code,
    context,
    userMessage: userMessage || USER_FRIENDLY_MESSAGES[type || classification.type],
    cause: error instanceof Error ? error : undefined,
  });
}

// Logger utility
export class Logger {
  private static instance: Logger;
  private enabled: boolean;

  private constructor() {
    this.enabled = appConfig.debug.enabled;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      return `${prefix} ${message}\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: any) {
    if (this.enabled && process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: any) {
    if (this.enabled) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: any) {
    if (this.enabled) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  error(message: string, error?: unknown, context?: any) {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    } : error;

    const fullContext = {
      ...context,
      error: errorInfo,
    };

    console.error(this.formatMessage("error", message, fullContext));

    // In production, you might want to send errors to an external service
    if (process.env.NODE_ENV === "production" && appConfig.performance.enableAnalytics) {
      this.sendToErrorService(message, error, context);
    }
  }

  private sendToErrorService(message: string, error?: unknown, context?: any) {
    // Placeholder for external error reporting service
    // Example: Sentry, LogRocket, etc.
    try {
      // Implementation would go here
      console.log("Error sent to monitoring service");
    } catch (err) {
      console.error("Failed to send error to monitoring service:", err);
    }
  }
}

// Global error handler
export function handleGlobalError(error: unknown, context?: Record<string, any>): AppError {
  const logger = Logger.getInstance();
  const appError = createError({ error, context });

  logger.error("Global error occurred", appError, context);

  return appError;
}

// Async error wrapper
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          throw handleGlobalError(error, context);
        });
      }
      
      return result;
    } catch (error) {
      throw handleGlobalError(error, context);
    }
  }) as T;
}

// React error boundary helper
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return { hasError: false };
}

export function handleErrorBoundary(
  error: Error,
  errorInfo: { componentStack: string }
): ErrorBoundaryState {
  const appError = createError({
    error,
    context: { componentStack: errorInfo.componentStack },
    type: ErrorType.CLIENT,
    severity: ErrorSeverity.HIGH,
  });

  const logger = Logger.getInstance();
  logger.error("React Error Boundary caught error", appError);

  return { hasError: true, error: appError };
}

// Retry mechanism
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: boolean;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = appConfig.api.retries,
    delay = appConfig.api.retryDelay,
    backoff = true,
    shouldRetry = (error) => {
      const classification = classifyError(error);
      return classification.type === ErrorType.NETWORK || classification.type === ErrorType.SERVER;
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries || !shouldRetry(error)) {
        break;
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw createError({
    error: lastError,
    message: `Operation failed after ${retries + 1} attempts`,
    context: { attempts: retries + 1 },
  });
}

// Export logger instance
export const logger = Logger.getInstance();

// Helper to get user-friendly error message
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }

  const classification = classifyError(error);
  return USER_FRIENDLY_MESSAGES[classification.type];
}

// Helper to check if error should be retried
export function shouldRetryError(error: unknown): boolean {
  const classification = classifyError(error);
  return [ErrorType.NETWORK, ErrorType.SERVER].includes(classification.type);
}