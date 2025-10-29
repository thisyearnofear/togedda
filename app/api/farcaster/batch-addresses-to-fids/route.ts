import { env } from "@/lib/env";
import { neynarRateLimiter } from "@/lib/rate-limiter";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

// In-memory cache for batch address to FID mapping
const batchAddressCache = new Map<string, { fid: number | null, timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /api/farcaster/batch-addresses-to-fids
 * Convert multiple Ethereum addresses to Farcaster IDs in a batch with rate limiting and caching
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

    // Split and normalize addresses
    const addresses = addressesParam.split(",").map(addr => addr.trim().toLowerCase());

    if (addresses.length === 0) {
      return NextResponse.json({ addressToFidMap: {} });
    }

    // Check if we have too many addresses (Neynar limit is 20)
    if (addresses.length > 20) {
      return NextResponse.json(
        { error: "Too many addresses. Maximum is 20 per request." },
        { status: 400 }
      );
    }

    // Check cache first
    const addressToFidMap: Record<string, number> = {};
    const addressesToFetch: string[] = [];

    // Check which addresses are in cache
    for (const address of addresses) {
      const cachedResult = batchAddressCache.get(address);
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
        if (cachedResult.fid !== null) {
          addressToFidMap[address] = cachedResult.fid;
        }
      } else {
        addressesToFetch.push(address);
      }
    }

    // If all addresses were in cache, return early
    if (addressesToFetch.length === 0) {
      console.log("All addresses found in cache");
      return NextResponse.json({ addressToFidMap });
    }

    console.log(`Looking up FIDs for ${addressesToFetch.length} addresses`);

    // Use rate limiter for Neynar API calls
    return await neynarRateLimiter.schedule(async () => {
      try {
        // Call the Neynar API to convert the addresses to FIDs
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesToFetch.join(',')}`,
          {
            headers: env.NEYNAR_API_KEY ? {
            "x-api-key": env.NEYNAR_API_KEY,
            } : {},
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Neynar API error:", errorText);

          // If we hit rate limit, return a 429 status
          if (response.status === 429) {
            return NextResponse.json(
              {
                error: "Rate limit exceeded, please try again later",
                details: errorText
              },
              { status: 429 }
            );
          }

          return NextResponse.json(
            { error: "Failed to fetch from Neynar API", details: errorText },
            { status: response.status }
          );
        }

        const data = await response.json();

        // Process the results and update cache
        if (data.users && data.users.length > 0) {
          data.users.forEach((user: any) => {
            if (user.custody_address && user.fid) {
              const normalizedAddress = user.custody_address.toLowerCase();
              addressToFidMap[normalizedAddress] = user.fid;

              // Update cache
              batchAddressCache.set(normalizedAddress, {
                fid: user.fid,
                timestamp: Date.now()
              });
            }
          });
        }

        // Cache negative results too
        for (const address of addressesToFetch) {
          if (!addressToFidMap[address]) {
            batchAddressCache.set(address, {
              fid: null,
              timestamp: Date.now()
            });
          }
        }

        return NextResponse.json({ addressToFidMap });
      } catch (error) {
        console.error("Error in Neynar API call:", error);
        return NextResponse.json(
          {
            error: "Error processing Neynar API request",
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    });
  } catch (error) {
    console.error("Error batch converting addresses to FIDs:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
