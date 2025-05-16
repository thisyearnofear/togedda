import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/farcaster/batch-addresses-to-fids
 * Convert multiple Ethereum addresses to Farcaster IDs in a batch
 */
export async function GET(req: NextRequest) {
  try {
    // Get the addresses from the query parameters
    const { searchParams } = new URL(req.url);
    const addressesParam = searchParams.get("addresses");

    if (!addressesParam) {
      return NextResponse.json(
        { error: "Addresses parameter is required" },
        { status: 400 }
      );
    }

    const addresses = addressesParam.split(",");

    if (addresses.length === 0) {
      return NextResponse.json({ addressToFidMap: {} });
    }

    // Call the Neynar API to convert the addresses to FIDs
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}`,
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

    // Create a map of address to FID
    const addressToFidMap: Record<string, number> = {};

    if (data.users && data.users.length > 0) {
      data.users.forEach((user: any) => {
        if (user.custody_address && user.fid) {
          addressToFidMap[user.custody_address.toLowerCase()] = user.fid;
        }
      });
    }

    return NextResponse.json({ addressToFidMap });
  } catch (error) {
    console.error("Error batch converting addresses to FIDs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
