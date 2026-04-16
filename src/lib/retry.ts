/**
 * Retry utility for database operations on serverless environments.
 * Handles transient connection failures gracefully.
 */

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 500,    // 500ms
  maxDelay: 3000,    // 3s
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<typeof DEFAULT_CONFIG> = {},
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation or unique constraint errors
      const msg = lastError.message.toLowerCase();
      if (
        msg.includes('unique constraint') ||
        msg.includes('validation') ||
        msg.includes('not found') ||
        msg.includes('unauthorized') ||
        msg.includes('invalid')
      ) {
        throw lastError;
      }

      // Only retry if not the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 200,
          maxDelay,
        );
        console.warn(
          `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
