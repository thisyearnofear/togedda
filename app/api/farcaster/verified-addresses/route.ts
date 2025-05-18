import { env } from "@/lib/env";
import { neynarRateLimiter } from "@/lib/rate-limiter";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

// In-memory cache for FID to verified addresses mapping
const verifiedAddressesCache = new Map<string, { addresses: string[], timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/farcaster/verified-addresses
 * Fetch all verified addresses for a Farcaster user by FID
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

    // Check cache first
    const cachedResult = verifiedAddressesCache.get(fid);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log(`Using cached verified addresses for FID: ${fid}`);
      return NextResponse.json({ addresses: cachedResult.addresses });
    }

    // Use rate limiter for Neynar API calls
    return await neynarRateLimiter.schedule(async () => {
      try {
        // Call the Neynar API to fetch user data with verifications
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user?fid=${fid}&viewer_fid=${fid}`,
          {
            headers: {
              "x-api-key": env.NEYNAR_API_KEY,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Neynar API error:", errorText);
          return NextResponse.json(
            { error: "Failed to fetch from Neynar API", details: errorText },
            { status: response.status }
          );
        }

        const data = await response.json();
        const user = data.user;
        
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Collect all verified addresses
        const addresses: string[] = [];
        
        // Add custody address
        if (user.custody_address) {
          addresses.push(user.custody_address.toLowerCase());
        }
        
        // Add verified addresses
        if (user.verifications && Array.isArray(user.verifications)) {
          user.verifications.forEach((address: string) => {
            if (!addresses.includes(address.toLowerCase())) {
              addresses.push(address.toLowerCase());
            }
          });
        }

        // Update cache
        verifiedAddressesCache.set(fid, {
          addresses,
          timestamp: Date.now()
        });

        return NextResponse.json({ addresses });
      } catch (error) {
        console.error("Error fetching verified addresses:", error);
        return NextResponse.json(
          { 
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    });
  } catch (error) {
    console.error("Error in verified-addresses route:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
