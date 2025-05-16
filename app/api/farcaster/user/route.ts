import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/farcaster/user
 * Fetch a Farcaster user by FID
 */
export async function GET(req: NextRequest) {
  try {
    // Get the FID from the query parameters
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { error: "FID parameter is required" },
        { status: 400 }
      );
    }

    // Call the Neynar API to fetch the user
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "x-api-key": env.NEYNAR_API_KEY,
        },
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

    if (data.users && data.users.length > 0) {
      return NextResponse.json({ user: data.users[0] });
    }

    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
