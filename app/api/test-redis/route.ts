import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check environment variables
    const redisUrl = process.env.REDIS_URL;
    const redisToken = process.env.REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      return NextResponse.json({
        success: false,
        message: "Redis not configured",
        error: "REDIS_URL or REDIS_TOKEN missing",
        config: {
          hasUrl: !!redisUrl,
          hasToken: !!redisToken,
          urlPreview: redisUrl ? `${redisUrl.substring(0, 20)}...` : null
        }
      }, { status: 500 });
    }

    if (!redis) {
      return NextResponse.json({
        success: false,
        message: "Redis client not initialized",
        error: "Redis client is null"
      }, { status: 500 });
    }

    // Test Redis connection with timeout
    const testKey = `health:${Date.now()}`;
    const testValue = {
      message: "Redis health check",
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substring(7)
    };

    // Test operations with individual timeouts
    const operations = [];

    // 1. Ping test
    try {
      const pingStart = Date.now();
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 5000))
      ]);
      operations.push({ operation: 'ping', success: true, duration: Date.now() - pingStart });
    } catch (error) {
      operations.push({ operation: 'ping', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 2. Set test
    try {
      const setStart = Date.now();
      await Promise.race([
        redis.set(testKey, JSON.stringify(testValue), { ex: 60 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Set timeout')), 5000))
      ]);
      operations.push({ operation: 'set', success: true, duration: Date.now() - setStart });
    } catch (error) {
      operations.push({ operation: 'set', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 3. Get test
    let retrieved = null;
    try {
      const getStart = Date.now();
      retrieved = await Promise.race([
        redis.get(testKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Get timeout')), 5000))
      ]);
      operations.push({ operation: 'get', success: true, duration: Date.now() - getStart });
    } catch (error) {
      operations.push({ operation: 'get', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // 4. Delete test
    try {
      const delStart = Date.now();
      await Promise.race([
        redis.del(testKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Delete timeout')), 5000))
      ]);
      operations.push({ operation: 'delete', success: true, duration: Date.now() - delStart });
    } catch (error) {
      operations.push({ operation: 'delete', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    const totalDuration = Date.now() - startTime;
    const allSuccessful = operations.every(op => op.success);

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful ? "Redis connection healthy" : "Redis connection has issues",
      operations,
      test: {
        set: testValue,
        retrieved: retrieved ? JSON.parse(retrieved as string) : null,
        dataIntegrity: retrieved ? JSON.stringify(testValue) === retrieved : false
      },
      performance: {
        totalDuration,
        averageOpDuration: operations.filter(op => op.duration).reduce((sum, op) => sum + (op.duration || 0), 0) / operations.filter(op => op.duration).length || 0
      },
      timestamp: new Date().toISOString()
    }, { status: allSuccessful ? 200 : 500 });

  } catch (error) {
    console.error("Redis health check error:", error);
    return NextResponse.json({
      success: false,
      message: "Redis health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
