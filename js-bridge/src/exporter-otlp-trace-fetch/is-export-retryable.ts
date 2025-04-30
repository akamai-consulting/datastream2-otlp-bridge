export function isExportRetryable(statusCode: number): boolean {
    const retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
  }
  
  export function parseRetryAfterToMills(
    retryAfter?: string | undefined | null
  ): number | undefined {
    if (retryAfter == null) {
      return undefined;
    }
  
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
      return seconds > 0 ? seconds * 1000 : -1;
    }
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After#directives
    const delay = new Date(retryAfter).getTime() - Date.now();
  
    if (delay >= 0) {
      return delay;
    }
    return 0;
  }