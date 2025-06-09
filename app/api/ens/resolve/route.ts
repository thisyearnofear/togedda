import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// Cache for ENS resolutions
const ensCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create public client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.public.blastapi.io"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Check cache first
    const cached = ensCache.get(normalizedAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        address: normalizedAddress,
        name: cached.name,
        cached: true,
      });
    }

    let ensName: string | null = null;

    try {
      // Resolve ENS name using viem
      ensName = await publicClient.getEnsName({
        address: address as `0x${string}`,
      });
    } catch (error) {
      console.warn(`ENS resolution failed for ${address}:`, error);
      // Continue with null name - this is expected for addresses without ENS
    }

    // Cache the result (including null results to avoid repeated failures)
    ensCache.set(normalizedAddress, {
      name: ensName,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (ensCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of ensCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          ensCache.delete(key);
        }
      }
    }

    return NextResponse.json({
      address: normalizedAddress,
      name: ensName,
      cached: false,
    });

  } catch (error) {
    console.error("ENS resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve ENS name"
      },
      { status: 500 }
    );
  }
}

// Handle reverse ENS lookup (name to address)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "ENS name is required" },
        { status: 400 }
      );
    }

    // Basic ENS name validation
    if (!name.includes(".")) {
      return NextResponse.json(
        { error: "Invalid ENS name format" },
        { status: 400 }
      );
    }

    const normalizedName = name.toLowerCase();

    // Check cache for reverse lookup
    const cacheKey = `reverse:${normalizedName}`;
    const cached = ensCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        name: normalizedName,
        address: cached.name, // In reverse lookup, we store address in name field
        cached: true,
      });
    }

    let resolvedAddress: string | null = null;

    try {
      // Resolve address from ENS name
      resolvedAddress = await publicClient.getEnsAddress({
        name: normalizedName,
      });
    } catch (error) {
      console.warn(`Reverse ENS resolution failed for ${name}:`, error);
      // Continue with null address
    }

    // Cache the result
    ensCache.set(cacheKey, {
      name: resolvedAddress,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      name: normalizedName,
      address: resolvedAddress,
      cached: false,
    });

  } catch (error) {
    console.error("Reverse ENS resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve ENS address"
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}