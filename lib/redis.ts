import { Redis } from "@upstash/redis";
import { env } from "process";

if (!env.REDIS_URL || !env.REDIS_TOKEN) {
  console.warn(
    "REDIS_URL or REDIS_TOKEN environment variable is not defined, please add to enable background notifications and webhooks.",
  );
}

export const redis =
  env.REDIS_URL && env.REDIS_TOKEN
    ? new Redis({
        url: env.REDIS_URL.startsWith('https://') ? env.REDIS_URL : `https://${env.REDIS_URL}`,
        token: env.REDIS_TOKEN,
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.exp(retryCount) * 50,
        },
        automaticDeserialization: false,
      })
    : null;
