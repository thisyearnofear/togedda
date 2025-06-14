import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json({
        success: false,
        message: "Redis not configured",
        error: "REDIS_URL or REDIS_TOKEN missing"
      }, { status: 500 });
    }

    // Test Redis connection
    const testKey = `test:${Date.now()}`;
    const testValue = { message: "Redis test", timestamp: new Date().toISOString() };
    
    // Set a test value
    await redis.set(testKey, testValue, { ex: 60 }); // Expire in 60 seconds
    
    // Get the test value back
    const retrieved = await redis.get(testKey);
    
    // Clean up
    await redis.del(testKey);

    return NextResponse.json({
      success: true,
      message: "Redis connection successful",
      test: {
        set: testValue,
        retrieved: retrieved,
        match: JSON.stringify(testValue) === JSON.stringify(retrieved)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Redis test error:", error);
    return NextResponse.json({
      success: false,
      message: "Redis connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
