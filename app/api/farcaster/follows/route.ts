import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/farcaster/follows
 * Fetch follows for a Farcaster user
 */
export async function GET(req: NextRequest) {
  try {
    // Get the FID from the query parameters
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    const limit = searchParams.get("limit") || "100";

    if (!fid) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 }
      );
    }

    // Call the Neynar API to fetch follows
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=${limit}`,
      {
        headers: env.NEYNAR_API_KEY ? {
        "x-api-key": env.NEYNAR_API_KEY,
        } : {},
      }
    );

    if (!response.ok) {
      console.error("Neynar API error:", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch from Neynar API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract FIDs from the response
    const follows = data.users.map((user: any) => user.fid);

    return NextResponse.json({ follows });
  } catch (error) {
    console.error("Error fetching follows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
