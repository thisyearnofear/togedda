import { env } from "@/lib/env";
import { neynarRateLimiter } from "@/lib/rate-limiter";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

// In-memory cache for address to FID mapping
const addressCache = new Map<string, { fid: number | null, timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /api/farcaster/address-to-fid
 * Convert an Ethereum address to a Farcaster ID with rate limiting and caching
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

    // Normalize the address (lowercase)
    const normalizedAddress = address.toLowerCase();

    // Check cache first
    const cachedResult = addressCache.get(normalizedAddress);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log(`Using cached result for address: ${normalizedAddress}`);

      if (cachedResult.fid === null) {
        return NextResponse.json({ fid: null });
      }

      // For cached FIDs, we still need to return the user data
      // We'll fetch it from the user endpoint
      try {
        const userResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${cachedResult.fid}`,
          {
            headers: {
              "x-api-key": env.NEYNAR_API_KEY,
            },
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.users && userData.users.length > 0) {
            const user = userData.users[0];
            return NextResponse.json({
              fid: user.fid,
              username: user.username,
              display_name: user.display_name,
              pfp_url: user.pfp_url
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data for cached FID:", error);
        // Fall back to just returning the FID
        return NextResponse.json({ fid: cachedResult.fid });
      }
    }

    console.log(`Looking up FID for address: ${normalizedAddress}`);

    // Use rate limiter for Neynar API calls
    return await neynarRateLimiter.schedule(async () => {
      try {
        // Call the Neynar API to convert the address to a FID
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${normalizedAddress}`,
          {
            headers: {
              "x-api-key": env.NEYNAR_API_KEY,
            },
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
            {
              error: "Failed to fetch from Neynar API",
              details: errorText,
              status: response.status
            },
            { status: response.status }
          );
        }

        const data = await response.json();
        console.log(`Neynar response for address ${normalizedAddress}:`,
          data.users ? `Found ${data.users.length} users` : "No users found");

        if (data.users && data.users.length > 0) {
          const user = data.users[0];
          console.log(`Found FID ${user.fid} for address ${normalizedAddress}`);

          // Update cache
          addressCache.set(normalizedAddress, {
            fid: user.fid,
            timestamp: Date.now()
          });

          return NextResponse.json({
            fid: user.fid,
            username: user.username,
            display_name: user.display_name,
            pfp_url: user.pfp_url
          });
        }

        console.log(`No FID found for address ${normalizedAddress}`);

        // Cache negative results too
        addressCache.set(normalizedAddress, {
          fid: null,
          timestamp: Date.now()
        });

        return NextResponse.json({ fid: null });
      } catch (error) {
        console.error("Error converting address to FID:", error);
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
    console.error("Error in address-to-fid route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
