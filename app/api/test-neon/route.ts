import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase, getUserStreak } from "@/lib/streaks-service-pg";
import { syncUserFitnessData, getUserFitnessData } from "@/lib/fitness-sync-service";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/test-neon
 * Test Neon database connection and fitness sync functionality
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "connection";
    const fid = searchParams.get("fid");

    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      success: false,
      data: null,
      error: null
    };

    switch (action) {
      case "connection":
        // Test basic database connection
        try {
          await initializeDatabase();
          results.success = true;
          results.data = "Database connection successful";
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Database connection failed";
        }
        break;

      case "migrate":
        // Migrate database schema
        try {
          // First initialize the database to ensure table exists
          await initializeDatabase();

          results.success = true;
          results.data = "Database schema updated with initializeDatabase()";
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Migration failed";
        }
        break;

      case "streak":
        // Test streak functionality
        if (!fid) {
          results.error = "FID parameter required for streak test";
          break;
        }
        
        try {
          const streakData = await getUserStreak(fid);
          results.success = true;
          results.data = streakData;
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Streak test failed";
        }
        break;

      case "fitness":
        // Test fitness data retrieval
        if (!fid) {
          results.error = "FID parameter required for fitness test";
          break;
        }
        
        try {
          const fitnessData = await getUserFitnessData(parseInt(fid));
          results.success = true;
          results.data = fitnessData;
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Fitness test failed";
        }
        break;

      case "sync":
        // Test fitness sync functionality
        if (!fid) {
          results.error = "FID parameter required for sync test";
          break;
        }
        
        try {
          const syncResult = await syncUserFitnessData(parseInt(fid));
          const updatedStreak = await getUserStreak(fid);
          const fitnessData = await getUserFitnessData(parseInt(fid));
          
          results.success = syncResult;
          results.data = {
            syncResult,
            updatedStreak,
            fitnessData
          };
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Sync test failed";
        }
        break;

      default:
        results.error = "Invalid action. Use: connection, migrate, streak, fitness, or sync";
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("Error in Neon test:", error);
    return NextResponse.json(
      { 
        error: "Test failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test-neon
 * Test creating/updating streak data
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fid, action = "create" } = body;

    if (!fid) {
      return NextResponse.json(
        { error: "FID is required" },
        { status: 400 }
      );
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      fid,
      success: false,
      data: null,
      error: null
    };

    try {
      // Initialize database first
      await initializeDatabase();

      if (action === "create") {
        // Test creating a new streak entry
        const streakData = await getUserStreak(fid.toString());
        results.success = true;
        results.data = streakData;
      } else if (action === "sync") {
        // Test syncing fitness data
        const syncResult = await syncUserFitnessData(fid);
        const updatedData = await getUserStreak(fid.toString());
        
        results.success = syncResult;
        results.data = {
          syncResult,
          streakData: updatedData
        };
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : "Operation failed";
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("Error in Neon POST test:", error);
    return NextResponse.json(
      { 
        error: "Test failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
