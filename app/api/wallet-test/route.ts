import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/wallet-test
 * Test endpoint to check Warpcast wallet functionality
 */
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Wallet test endpoint is working",
      instructions: {
        title: "Testing Warpcast Wallet",
        steps: [
          "1. Make sure you're using the Warpcast app",
          "2. Check that the wallet is properly connected in the UI",
          "3. Try voting on a prediction with a small amount (0.01 CELO)",
          "4. Look for transaction confirmation in the UI",
          "5. If the transaction fails, check the console logs for error details"
        ],
        notes: [
          "The Warpcast wallet doesn't support the eth_getTransactionReceipt method",
          "This means we can't wait for transaction confirmation in the traditional way",
          "Instead, we use Wagmi's useWaitForTransactionReceipt hook which handles this limitation",
          "Transactions should still go through even if we can't confirm them directly"
        ]
      },
      warpcastWalletInfo: {
        supportedMethods: [
          "eth_accounts",
          "eth_chainId",
          "eth_sendTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData_v4"
        ],
        unsupportedMethods: [
          "eth_getTransactionReceipt",
          "eth_getTransactionByHash"
        ],
        notes: "The Warpcast wallet is designed for simplicity and security, not for complex dApp interactions"
      }
    });
  } catch (error) {
    console.error("Error in wallet test endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
