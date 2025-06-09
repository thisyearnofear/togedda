import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

// Cache for ENSData resolutions
const ensdataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ENSData API configuration
const ENSDATA_BASE_URL = "https://api.ensdata.net";

interface ENSDataProfile {
  name?: string;
  address: string;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  location?: string;
  notice?: string;
  keywords?: string;
  discord?: string;
  github?: string;
  reddit?: string;
  twitter?: string;
  telegram?: string;
  snapshot?: string;
  header?: string;
  contentHash?: string;
  texts?: Record<string, string>;
  coins?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const name = searchParams.get("name");

    if (!address && !name) {
      return NextResponse.json(
        { error: "Either address or name parameter is required" },
        { status: 400 }
      );
    }

    // Validate address if provided
    if (address && !isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const query = address ? address.toLowerCase() : name?.toLowerCase();
    const queryType = address ? "address" : "name";
    const cacheKey = `${queryType}:${query}`;

    // Check cache first
    const cached = ensdataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    let profileData: ENSDataProfile | null = null;
    let resolvedName: string | null = null;
    let resolvedAddress: string | null = null;

    try {
      if (address) {
        // Resolve name from address
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const nameResponse = await fetch(
          `${ENSDATA_BASE_URL}/${address}`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Imperfect-Form/1.0",
            },
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          if (nameData && nameData.name) {
            resolvedName = nameData.name;
            profileData = nameData;
          }
        } else if (nameResponse.status === 404) {
          console.log(`No ENS name found for address ${address}`);
        } else {
          console.warn(`ENSData API error for address: ${nameResponse.status}`);
        }
      } else if (name) {
        // Resolve address from name
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        const addressResponse = await fetch(
          `${ENSDATA_BASE_URL}/${name}`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Imperfect-Form/1.0",
            },
            signal: controller2.signal,
          }
        );
        
        clearTimeout(timeoutId2);

        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          if (addressData && addressData.address) {
            resolvedAddress = addressData.address;
            profileData = addressData;
          }
        } else if (addressResponse.status === 404) {
          console.log(`No address found for ENS name ${name}`);
        } else {
          console.warn(`ENSData API error for name: ${addressResponse.status}`);
        }
      }
    } catch (error) {
      console.warn(`ENSData request failed:`, error);
    }

    // If primary lookup failed, try alternative endpoints
    if (!profileData && address) {
      try {
        // Try reverse lookup endpoint
        const reverseController = new AbortController();
        const reverseTimeoutId = setTimeout(() => reverseController.abort(), 8000);
        
        const reverseResponse = await fetch(
          `${ENSDATA_BASE_URL}/reverse/${address}`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Imperfect-Form/1.0",
            },
            signal: reverseController.signal,
          }
        );
        
        clearTimeout(reverseTimeoutId);

        if (reverseResponse.ok) {
          const reverseData = await reverseResponse.json();
          if (reverseData && reverseData.name) {
            resolvedName = reverseData.name;
            profileData = reverseData;
          }
        }
      } catch (reverseError) {
        console.warn(`ENSData reverse lookup failed:`, reverseError);
      }
    }

    // Format response
    const result = {
      query,
      queryType,
      name: resolvedName,
      address: resolvedAddress || (address ? address.toLowerCase() : null),
      profile: profileData,
      found: !!profileData,
      cached: false,
    };

    // Cache the result (including null results to avoid repeated failures)
    ensdataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (ensdataCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of ensdataCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          ensdataCache.delete(key);
        }
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("ENSData resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve ENS data"
      },
      { status: 500 }
    );
  }
}

// Batch resolution endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, names } = body;

    if ((!addresses || addresses.length === 0) && (!names || names.length === 0)) {
      return NextResponse.json(
        { error: "At least one address or name is required" },
        { status: 400 }
      );
    }

    const queries = [
      ...(addresses || []).map((addr: string) => ({ type: "address", value: addr })),
      ...(names || []).map((name: string) => ({ type: "name", value: name })),
    ];

    if (queries.length > 25) {
      return NextResponse.json(
        { error: "Maximum 25 queries allowed per batch" },
        { status: 400 }
      );
    }

    const results = [];

    // Process queries in smaller batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (query) => {
        try {
          const params = new URLSearchParams();
          if (query.type === "address") {
            params.set("address", query.value);
          } else {
            params.set("name", query.value);
          }

          const response = await fetch(
            `${request.nextUrl.origin}/api/ensdata/resolve?${params.toString()}`
          );
          
          if (response.ok) {
            return await response.json();
          } else {
            return {
              query: query.value,
              queryType: query.type,
              name: null,
              address: query.type === "address" ? query.value : null,
              profile: null,
              found: false,
              error: `HTTP ${response.status}`,
            };
          }
        } catch (error) {
          return {
            query: query.value,
            queryType: query.type,
            name: null,
            address: query.type === "address" ? query.value : null,
            profile: null,
            found: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to be respectful to the API
      if (i + BATCH_SIZE < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      results,
      total: results.length,
      found: results.filter(r => r.found).length,
    });

  } catch (error) {
    console.error("ENSData batch resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve ENS data in batch"
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}