import { getUserStreak, updateUserStreak, initializeDatabase } from "@/lib/streaks-service-pg";
import { NextRequest, NextResponse } from "next/server";

// Initialize the database schema
initializeDatabase().catch(console.error);

/**
 * GET /api/streaks
 * Get the current user's streak data
 */
export async function GET(req: NextRequest) {
  try {
    // Get user FID from the request headers (set by middleware)
    const fid = req.headers.get("x-user-fid");

    if (!fid) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    // Get the user's streak data
    const streakData = await getUserStreak(fid);

    return NextResponse.json(streakData);
  } catch (error) {
    console.error("Error fetching streak data:", error);
    return NextResponse.json(
      { error: "Failed to fetch streak data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streaks
 * Update the current user's streak
 */
export async function POST(req: NextRequest) {
  try {
    // Get user FID from the request headers (set by middleware)
    const fid = req.headers.get("x-user-fid");

    if (!fid) {
      return NextResponse.json(
        { error: "Unauthorized - User not authenticated" },
        { status: 401 }
      );
    }

    // Update the user's streak
    const updatedStreak = await updateUserStreak(fid);

    return NextResponse.json({
      success: true,
      streak: updatedStreak
    });
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 }
    );
  }
}
