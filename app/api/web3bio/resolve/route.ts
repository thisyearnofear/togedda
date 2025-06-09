import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { env } from "@/lib/env";

// Cache for Web3.bio resolutions
const web3bioCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Web3.bio API configuration
const WEB3BIO_BASE_URL = "https://api.web3.bio";
const WEB3BIO_ENDPOINTS = {
  profile: "/profile",
  ns: "/ns",
  batch: "/batch",
};

interface Web3BioProfile {
  address: string;
  avatar?: string;
  description?: string;
  email?: string;
  location?: string;
  website?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
  ens?: string[];
  lens?: string[];
  farcaster?: string[];
  unstoppable?: string[];
  dotbit?: string[];
  solana?: string[];
  clusters?: string[];
}

interface Web3BioResponse {
  address: string;
  identity: string;
  platform: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  email?: string;
  location?: string;
  header?: string;
  contenthash?: string;
  links?: {
    twitter?: { handle: string; url: string };
    github?: { handle: string; url: string };
    discord?: { handle: string };
    telegram?: { handle: string; url: string };
    website?: string[];
    mirror?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const platform = searchParams.get("platform") || "ethereum";

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Validate Ethereum address if platform is ethereum
    if (platform === "ethereum" && !isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const cacheKey = `${platform}:${normalizedAddress}`;

    // Check cache first
    const cached = web3bioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    // Prepare API request
    const apiUrl = `${WEB3BIO_BASE_URL}${WEB3BIO_ENDPOINTS.profile}/${platform}/${address}`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": "Imperfect-Form/1.0",
    };

    // Add API key if available
    if (env.WEB3_BIO_API_KEY) {
      headers["X-API-Key"] = env.WEB3_BIO_API_KEY;
    }

    let profileData: Web3BioResponse | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(apiUrl, {
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        profileData = data;
      } else if (response.status === 404) {
        // Profile not found - this is expected for many addresses
        console.log(`No Web3.bio profile found for ${address}`);
      } else {
        console.warn(`Web3.bio API error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Web3.bio request failed for ${address}:`, error);
    }

    // If no profile data, try alternative approach with batch endpoint
    if (!profileData && platform === "ethereum") {
      try {
        const batchUrl = `${WEB3BIO_BASE_URL}${WEB3BIO_ENDPOINTS.batch}`;
        const batchController = new AbortController();
        const batchTimeoutId = setTimeout(() => batchController.abort(), 15000);
        
        const batchResponse = await fetch(batchUrl, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            addresses: [address],
            platforms: ["ens", "lens", "farcaster", "unstoppable", "dotbit"],
          }),
          signal: batchController.signal,
        });
        
        clearTimeout(batchTimeoutId);

        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          if (batchData && batchData.length > 0) {
            profileData = batchData[0];
          }
        }
      } catch (batchError) {
        console.warn(`Web3.bio batch request failed:`, batchError);
      }
    }

    // Format response
    const result = {
      address: normalizedAddress,
      platform,
      profile: profileData,
      found: !!profileData,
      cached: false,
    };

    // Cache the result (including null results to avoid repeated failures)
    web3bioCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (web3bioCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of web3bioCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          web3bioCache.delete(key);
        }
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Web3.bio resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve Web3.bio profile"
      },
      { status: 500 }
    );
  }
}

// Batch resolution endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, platforms = ["ethereum"] } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "Addresses array is required" },
        { status: 400 }
      );
    }

    if (addresses.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 addresses allowed per batch" },
        { status: 400 }
      );
    }

    const results = [];

    // Process in smaller batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (address: string) => {
        try {
          // Use the GET endpoint for individual resolution
          const response = await fetch(
            `${request.nextUrl.origin}/api/web3bio/resolve?address=${encodeURIComponent(address)}&platform=${platforms[0] || "ethereum"}`
          );
          
          if (response.ok) {
            return await response.json();
          } else {
            return {
              address,
              platform: platforms[0] || "ethereum",
              profile: null,
              found: false,
              error: `HTTP ${response.status}`,
            };
          }
        } catch (error) {
          return {
            address,
            platform: platforms[0] || "ethereum",
            profile: null,
            found: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      results,
      total: results.length,
      found: results.filter(r => r.found).length,
    });

  } catch (error) {
    console.error("Web3.bio batch resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve Web3.bio profiles in batch"
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}