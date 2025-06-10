import { NextRequest, NextResponse } from "next/server";
import { syncFitnessData, syncUserFitnessData, getUserFitnessData } from "@/lib/fitness-sync-service";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * POST /api/sync-fitness
 * Sync fitness data from blockchain to Neon database
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

    const body = await req.json().catch(() => ({}));
    const { action = "user", targetFid } = body;

    if (action === "user") {
      // Sync data for the current user
      const userFid = targetFid || parseInt(fid);
      const success = await syncUserFitnessData(userFid);
      
      if (success) {
        // Get updated fitness data
        const fitnessData = await getUserFitnessData(userFid);
        
        return NextResponse.json({
          success: true,
          message: `Fitness data synced for FID ${userFid}`,
          fitnessData
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `No fitness data found for FID ${userFid}`
        });
      }
    } else if (action === "all") {
      // Sync all fitness data (admin only - you might want to add admin check)
      const result = await syncFitnessData();
      
      return NextResponse.json({
        success: true,
        message: "Full fitness data sync completed",
        result
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'user' or 'all'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error in fitness sync:", error);
    return NextResponse.json(
      { error: "Failed to sync fitness data" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-fitness
 * Get fitness data for the current user
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

    const { searchParams } = new URL(req.url);
    const targetFid = searchParams.get("fid");
    
    const userFid = targetFid ? parseInt(targetFid) : parseInt(fid);
    const fitnessData = await getUserFitnessData(userFid);
    
    if (fitnessData) {
      return NextResponse.json({
        success: true,
        fitnessData
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `No fitness data found for FID ${userFid}`,
        fitnessData: null
      });
    }

  } catch (error) {
    console.error("Error getting fitness data:", error);
    return NextResponse.json(
      { error: "Failed to get fitness data" },
      { status: 500 }
    );
  }
}
