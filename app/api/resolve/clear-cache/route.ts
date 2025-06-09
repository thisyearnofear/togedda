import { NextResponse } from "next/server";
import { clearResolutionCache } from "@/lib/services/address-resolution";

/**
 * Clear Address Resolution Cache
 * 
 * POST /api/resolve/clear-cache
 * 
 * Development endpoint to clear the unified resolution cache
 */

export async function POST() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Cache clearing only available in development mode" },
        { status: 403 }
      );
    }

    clearResolutionCache();

    return NextResponse.json({
      success: true,
      message: "Address resolution cache cleared successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Cache clearing error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to clear cache"
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Cache clearing only available in development mode" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Cache clearing endpoint ready",
    environment: "development"
  });
}
