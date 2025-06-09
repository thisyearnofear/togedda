import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { resolveAddress, resolveAddresses, ResolvedProfile } from "@/lib/services/address-resolution";

/**
 * Unified Address Resolution API
 * 
 * GET /api/resolve/address?address=0x123...
 * POST /api/resolve/address { addresses: ["0x123...", "0x456..."] }
 * 
 * Uses fallback hierarchy: Web3.bio → ENSData → Neynar
 */

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

    // Validate Ethereum address
    if (!isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const profile = await resolveAddress(address);

    return NextResponse.json({
      success: true,
      profile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Address resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve address"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "Addresses array is required" },
        { status: 400 }
      );
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 addresses allowed per batch" },
        { status: 400 }
      );
    }

    // Validate all addresses
    const invalidAddresses = addresses.filter(addr => !isAddress(addr));
    if (invalidAddresses.length > 0) {
      return NextResponse.json(
        { 
          error: "Invalid Ethereum addresses found",
          invalid: invalidAddresses
        },
        { status: 400 }
      );
    }

    const profiles = await resolveAddresses(addresses);

    return NextResponse.json({
      success: true,
      profiles,
      total: profiles.length,
      resolved: profiles.filter(p => p.displayName || p.username || p.ens).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Batch address resolution error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to resolve addresses"
      },
      { status: 500 }
    );
  }
}

// Health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
