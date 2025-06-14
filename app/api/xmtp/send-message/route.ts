import { NextRequest, NextResponse } from "next/server";
import { sendMessageToBot } from "@/lib/bot-service-client";

/**
 * API endpoint to send a message to the XMTP bot
 * POST /api/xmtp/send-message
 *
 * This now proxies to the Northflank-deployed bot service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userAddress, conversationId, context } = body;

    if (!message || !userAddress) {
      return NextResponse.json(
        { error: 'Message and userAddress are required' },
        { status: 400 }
      );
    }

    // Proxy to Northflank bot service
    const response = await sendMessageToBot(userAddress, message, conversationId, context);

    return NextResponse.json(response);



  } catch (error) {
    console.error('❌ Send message API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
