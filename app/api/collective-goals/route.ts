import { NextRequest, NextResponse } from "next/server";
import { fetchAllNetworksDataServer, NetworkData } from "@/lib/blockchain-server";
import { MOUNT_OLYMPUS_GOAL, KENYA_RUN_GOAL } from "@/lib/constants";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

// Server-side version of calculateCollectiveGoals
function calculateCollectiveGoalsServer(allNetworksData: NetworkData) {
  let totalPushups = 0;
  let totalSquats = 0;

  Object.values(allNetworksData).forEach(networkData => {
    networkData.forEach(entry => {
      totalPushups += entry.pushups;
      totalSquats += entry.squats;
    });
  });

  // Calculate progress for Mount Olympus challenge
  const mountOlympusProgress = (totalPushups / MOUNT_OLYMPUS_GOAL) * 100;

  // Calculate progress for Kenya Run challenge
  const kenyaRunProgress = (totalSquats / KENYA_RUN_GOAL) * 100;

  return {
    totalPushups,
    totalSquats,
    mountOlympus: {
      goal: MOUNT_OLYMPUS_GOAL,
      current: totalPushups,
      progressPercentage: mountOlympusProgress
    },
    kenyaRun: {
      goal: KENYA_RUN_GOAL,
      current: totalSquats,
      progressPercentage: kenyaRunProgress
    }
  };
}

/**
 * GET /api/collective-goals
 * Get fresh collective goals data using server-side blockchain fetching
 * This ensures the most up-to-date data for collective goals
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("force") === "true";

    console.log(`[CollectiveGoals API] Fetching data with forceRefresh: ${forceRefresh}`);

    // Use server-side function to get fresh blockchain data
    const networkData = await fetchAllNetworksDataServer(forceRefresh);
    
    if (!networkData) {
      return NextResponse.json(
        { error: "Failed to fetch network data" },
        { status: 500 }
      );
    }

    // Calculate collective goals from fresh data using server-side function
    const goals = calculateCollectiveGoalsServer(networkData);
    
    console.log(`[CollectiveGoals API] Calculated goals:`, {
      totalPushups: goals.totalPushups,
      totalSquats: goals.totalSquats,
      mountOlympusProgress: goals.mountOlympus.progressPercentage,
      kenyaRunProgress: goals.kenyaRun.progressPercentage
    });

    return NextResponse.json({
      success: true,
      goals,
      networkData,
      timestamp: new Date().toISOString(),
      cached: !forceRefresh
    });

  } catch (error) {
    console.error("[CollectiveGoals API] Error fetching collective goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch collective goals data" },
      { status: 500 }
    );
  }
}
