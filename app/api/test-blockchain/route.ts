import { NextRequest, NextResponse } from "next/server";
import { 
  fetchAllNetworksDataServer, 
  getAddressFitnessDataServer,
  getMultiAddressFitnessDataServer 
} from "@/lib/services/blockchain-server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/test-blockchain
 * Test server-side blockchain data fetching
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "networks";
    const address = searchParams.get("address");

    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      success: false,
      data: null,
      error: null
    };

    switch (action) {
      case "networks":
        // Test fetching all network data
        try {
          console.log("[Test] Fetching all networks data...");
          const networkData = await fetchAllNetworksDataServer(true);
          
          // Count total entries
          let totalEntries = 0;
          const networkSummary: any = {};
          
          for (const [network, scores] of Object.entries(networkData)) {
            totalEntries += scores.length;
            networkSummary[network] = {
              entries: scores.length,
              totalPushups: scores.reduce((sum, s) => sum + s.pushups, 0),
              totalSquats: scores.reduce((sum, s) => sum + s.squats, 0),
              sampleAddresses: scores.slice(0, 3).map(s => s.user)
            };
          }
          
          results.success = true;
          results.data = {
            totalEntries,
            networkSummary,
            networks: Object.keys(networkData)
          };
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Network fetch failed";
        }
        break;

      case "address":
        // Test fetching data for a specific address
        if (!address) {
          results.error = "Address parameter required for address test";
          break;
        }
        
        try {
          console.log(`[Test] Fetching data for address: ${address}`);
          const addressData = await getAddressFitnessDataServer(address);
          results.success = true;
          results.data = addressData;
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Address fetch failed";
        }
        break;

      case "multi":
        // Test fetching data for multiple addresses (papa's addresses)
        const papaAddresses = [
          "0x8b03a2c365c261aebe684224dbb6c9592abcdfb2",
          "0x55a5705453ee82c742274154136fce8149597058", 
          "0xd865cd7ccc91f83692ab330981c3e3e9d7a0526a"
        ];
        
        try {
          console.log(`[Test] Fetching data for papa's addresses: ${papaAddresses.join(', ')}`);
          const multiData = await getMultiAddressFitnessDataServer(papaAddresses);
          results.success = true;
          results.data = multiData;
        } catch (error) {
          results.error = error instanceof Error ? error.message : "Multi-address fetch failed";
        }
        break;

      default:
        results.error = "Invalid action. Use: networks, address, or multi";
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("Error in blockchain test:", error);
    return NextResponse.json(
      { 
        error: "Test failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
