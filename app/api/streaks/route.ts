import { getUserStreak, updateUserStreak, initializeDatabase } from "@/lib/streaks-service-pg";
import { syncUserFitnessData, getUserFitnessData } from "@/lib/fitness-sync-service";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

// Initialize the database schema only at runtime, not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  initializeDatabase().catch(console.error);
}

/**
 * GET /api/streaks
 * Get the current user's streak data
 */
export async function GET(req: NextRequest) {
  try {
    // Get user FID from request (query params or headers)
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid") || req.headers.get("x-fid");

    if (!fid) {
      return NextResponse.json(
        { error: "FID required - provide as ?fid=YOUR_FID or x-fid header" },
        { status: 400 }
      );
    }

    // Check if we should sync fitness data first
    const shouldSync = searchParams.get("sync") === "true";

    if (shouldSync) {
      try {
        console.log(`Syncing fitness data for FID ${fid}`);
        await syncUserFitnessData(parseInt(fid));
      } catch (syncError) {
        console.error("Error syncing fitness data:", syncError);
        // Continue even if sync fails
      }
    }

    // Get the user's streak data
    const streakData = await getUserStreak(fid);

    // Also get fitness data for additional context
    const fitnessData = await getUserFitnessData(parseInt(fid));

    return NextResponse.json({
      ...streakData,
      fitnessData
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
 * POST /api/streaks
 * Update the current user's streak
 */
export async function POST(req: NextRequest) {
  try {
    // Get user FID from request (body or headers)
    const body = await req.json().catch(() => ({}));
    const fid = body.fid || req.headers.get("x-fid");

    if (!fid) {
      return NextResponse.json(
        { error: "FID required - provide in request body or x-fid header" },
        { status: 400 }
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
