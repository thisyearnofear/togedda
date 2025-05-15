import { getUserStreak, updateUserStreak } from "@/lib/streaks-service-pg";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/streaks/test
 * Test endpoint to get all streak data for a user
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

    return NextResponse.json({
      message: "Test endpoint for streak data",
      streakData
    });
  } catch (error) {
    console.error("Error fetching streak data:", error);
    return NextResponse.json(
      { error: "Failed to fetch streak data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streaks/test
 * Test endpoint to manually update a user's streak
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
      message: "Streak manually updated for testing",
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
