/**
 * A simple rate limiter to prevent API rate limit errors
 */
export class RateLimiter {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestsInLastMinute = 0;

  constructor(
    private readonly requestsPerMinute: number = 50,
    private readonly minTimeBetweenRequests: number = 100 // ms
  ) {}

  /**
   * Enqueue a function to be executed with rate limiting
   * @param fn Function to execute
   * @returns Promise that resolves with the function's result
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<any>,
        resolve: resolve as (value: any) => void,
        reject,
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    
    // Check if we need to wait before making the next request
    const timeSinceLastRequest = now - this.lastRequestTime;
    const waitTime = Math.max(0, this.minTimeBetweenRequests - timeSinceLastRequest);
    
    // If we've made too many requests in the last minute, wait until we can make more
    if (this.requestsInLastMinute >= this.requestsPerMinute) {
      // Wait until a minute has passed since the last request
      const timeToWait = Math.max(0, 60000 - (now - this.lastRequestTime));
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      this.requestsInLastMinute = 0;
    }
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const { fn, resolve, reject } = this.queue.shift()!;

    try {
      this.lastRequestTime = Date.now();
      this.requestsInLastMinute++;
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      // Process the next item in the queue
      setTimeout(() => this.processQueue(), 0);
    }
  }
}

// Create a singleton instance for Neynar API
export const neynarRateLimiter = new RateLimiter(50, 100); // 50 requests per minute, 100ms between requests
