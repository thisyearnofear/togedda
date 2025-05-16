import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/farcaster/address-to-fid
 * Convert an Ethereum address to a Farcaster ID
 */
export async function GET(req: NextRequest) {
  try {
    // Get the address from the query parameters
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Call the Neynar API to convert the address to a FID
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
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
      return NextResponse.json({ fid: data.users[0].fid });
    }

    return NextResponse.json({ fid: null });
  } catch (error) {
    console.error("Error converting address to FID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
