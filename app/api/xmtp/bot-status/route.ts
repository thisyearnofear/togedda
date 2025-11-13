import { NextRequest, NextResponse } from "next/server";
import { getBotStatus } from "@/lib/services/bot-service-client";

/**
 * API endpoint to get XMTP bot status
 * GET /api/xmtp/bot-status
 *
 * This now proxies to the Northflank-deployed bot service
 */
export async function GET(request: NextRequest) {
  try {
    // Proxy to Northflank bot service
    const status = await getBotStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting bot status from Northflank service:', error);
    return NextResponse.json(
      {
        error: 'Failed to get bot status from backend service',
        online: false,
        address: 'Backend service unavailable',
        environment: 'Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
