import { NextApiRequest, NextApiResponse } from "next";

/**
 * Autonomous Bot Action: Auto-resolve predictions using AgentKit
 * This is where AgentKit should be used - for autonomous bot actions, not user transactions
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🤖 Starting autonomous prediction resolution...");

    // Import AgentKit for autonomous bot actions
    const { getAgentKitInstance } = await import(
      "../../../lib/agentkit-integration"
    );
    const { getAllChainPredictions } = await import(
      "../../../lib/services/dual-chain-service"
    );

    // Get all predictions that might need resolution
    const allPredictions = await getAllChainPredictions();
    const now = Math.floor(Date.now() / 1000);

    // Find predictions that are past their target date and unresolved
    const predictionsToResolve = allPredictions.filter((prediction) => {
      return (
        prediction.targetDate < now && // Past target date
        prediction.status === 0 && // Unresolved (assuming 0 = active)
        prediction.autoResolvable // Marked as auto-resolvable
      );
    });

    console.log(
      `🔍 Found ${predictionsToResolve.length} predictions ready for auto-resolution`
    );

    if (predictionsToResolve.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No predictions ready for auto-resolution",
        resolved: 0,
      });
    }

    // Get AgentKit instance for autonomous actions
    const agentKit = await getAgentKitInstance();

    if (!agentKit.isInitialized()) {
      console.warn("⚠️ AgentKit not initialized, skipping auto-resolution");
      return res.status(200).json({
        success: false,
        error: "AgentKit not available for autonomous actions",
        resolved: 0,
      });
    }

    const resolutionResults = [];

    // Process each prediction for auto-resolution
    for (const prediction of predictionsToResolve) {
      try {
        console.log(
          `🎯 Auto-resolving prediction ${prediction.id}: ${prediction.title}`
        );

        // Determine outcome based on prediction data
        // This is where the bot autonomously decides the outcome
        let outcome = false; // Default to NO/false
        let reason = "Target date passed without completion";

        // For fitness predictions, check if target was reached
        if (prediction.category === 0) {
          // FITNESS category
          // Check if current value meets or exceeds target value
          if (prediction.currentValue >= prediction.targetValue) {
            outcome = true;
            reason = `Target achieved: ${prediction.currentValue}/${prediction.targetValue}`;
          } else {
            outcome = false;
            reason = `Target not met: ${prediction.currentValue}/${prediction.targetValue}`;
          }
        }

        // Use AgentKit to autonomously resolve the prediction
        const resolutionResult = await agentKit.executeGaslessTransaction(
          prediction.chain === "celo"
            ? "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F" // CELO contract
            : "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB", // Base prediction market (SweatEquityBot compatible)
          "resolvePrediction",
          [prediction.id, outcome],
          await agentKit.getWalletAddress()
        );

        if (resolutionResult.success) {
          console.log(
            `✅ Auto-resolved prediction ${prediction.id}: ${
              outcome ? "YES" : "NO"
            }`
          );
          resolutionResults.push({
            predictionId: prediction.id,
            title: prediction.title,
            outcome: outcome ? "YES" : "NO",
            reason,
            txHash: resolutionResult.txHash,
            chain: prediction.chain,
          });
        } else {
          console.error(
            `❌ Failed to resolve prediction ${prediction.id}:`,
            resolutionResult.error
          );
          resolutionResults.push({
            predictionId: prediction.id,
            title: prediction.title,
            error: resolutionResult.error,
            chain: prediction.chain,
          });
        }
      } catch (error) {
        console.error(
          `❌ Error processing prediction ${prediction.id}:`,
          error
        );
        resolutionResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          error: error instanceof Error ? error.message : "Unknown error",
          chain: prediction.chain,
        });
      }
    }

    const successfulResolutions = resolutionResults.filter((r) => r.txHash);

    console.log(
      `🎉 Auto-resolution complete: ${successfulResolutions.length}/${predictionsToResolve.length} successful`
    );

    return res.status(200).json({
      success: true,
      message: `Auto-resolved ${successfulResolutions.length} predictions`,
      resolved: successfulResolutions.length,
      total: predictionsToResolve.length,
      results: resolutionResults,
    });
  } catch (error) {
    console.error("❌ Auto-resolution error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
