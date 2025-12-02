export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  RATE_LIMITED = "RATE_LIMITED",
  NOT_FOUND = "NOT_FOUND",
  GROQ_API_ERROR = "GROQ_API_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  originalError?: unknown;
  retryable: boolean;
  timestamp: number;
}

export function createAppError(
  code: ErrorCode,
  message: string,
  originalError?: unknown,
  retryable = false
): AppError {
  return {
    code,
    message,
    originalError,
    retryable,
    timestamp: Date.now(),
  };
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error instanceof Error && error.name === "NetworkError") {
    return true;
  }
  return false;
}

export function parseApiError(response: Response, data?: unknown): AppError {
  const status = response.status;

  if (status === 401 || status === 403) {
    return createAppError(
      ErrorCode.SESSION_EXPIRED,
      "Your session has expired. Please log in again.",
      data,
      false
    );
  }

  if (status === 404) {
    return createAppError(
      ErrorCode.NOT_FOUND,
      "The requested resource was not found.",
      data,
      false
    );
  }

  if (status === 429) {
    return createAppError(
      ErrorCode.RATE_LIMITED,
      "Too many requests. Please wait a moment and try again.",
      data,
      true
    );
  }

  if (status >= 500) {
    return createAppError(
      ErrorCode.API_ERROR,
      "Server error. Please try again later.",
      data,
      true
    );
  }

  return createAppError(
    ErrorCode.API_ERROR,
    "An error occurred. Please try again.",
    data,
    true
  );
}

export function logError(error: AppError, context?: string): void {
  const logData = {
    code: error.code,
    message: error.message,
    context,
    timestamp: new Date(error.timestamp).toISOString(),
    originalError:
      error.originalError instanceof Error
        ? {
            name: error.originalError.name,
            message: error.originalError.message,
            stack: error.originalError.stack,
          }
        : error.originalError,
  };

  console.error("[AppError]", logData);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        onRetry?.(attempt + 1, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function validateUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.length > 0;
}

export function validateSummaryData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;

  const summary = data as Record<string, unknown>;

  if (typeof summary.understanding_level !== "number") return false;
  if (typeof summary.session_count !== "number") return false;

  return true;
}

export function safeParseNumber(
  value: unknown,
  defaultValue: number
): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export function safeParseArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return defaultValue;
}

export function safeParseString(value: unknown, defaultValue = ""): string {
  if (typeof value === "string") {
    return value;
  }
  return defaultValue;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function limitArray<T>(arr: T[], limit: number): T[] {
  return arr.slice(0, limit);
}

export function calculateUnderstandingLevel(sessionCount: number): number {
  if (typeof sessionCount !== "number" || isNaN(sessionCount)) {
    return 25;
  }

  if (sessionCount <= 0) {
    return 25;
  }

  if (sessionCount >= 1000) {
    return 75;
  }

  const baseLevel = 25;
  let currentLevel = baseLevel;

  for (let i = 1; i <= sessionCount && currentLevel < 75; i++) {
    const increment = Math.max(1, Math.floor(10 / Math.sqrt(i)));
    currentLevel = Math.min(75, currentLevel + increment);
  }

  return currentLevel;
}
