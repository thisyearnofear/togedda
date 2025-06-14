import { NextApiRequest, NextApiResponse } from "next";

/**
 * Autonomous Bot Action: Create AI-generated predictions using AgentKit
 * This demonstrates proper AgentKit usage for autonomous bot actions
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, network = "base" } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ error: "Prompt required for AI prediction generation" });
    }

    console.log("🤖 Creating autonomous AI prediction...");
    console.log("📝 Prompt:", prompt);

    // Import AgentKit for autonomous bot actions
    const { getAgentKitInstance } = await import(
      "../../../lib/agentkit-integration"
    );

    // Get AgentKit instance for autonomous actions
    const agentKit = await getAgentKitInstance();

    if (!agentKit.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: "AgentKit not available for autonomous actions",
      });
    }

    // Generate AI prediction using AgentKit's AI capabilities
    const aiPredictionResponse = await agentKit.generatePredictionProposal(
      prompt
    );

    if (!aiPredictionResponse) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate AI prediction",
      });
    }

    console.log(
      "🎯 Generated AI prediction response:",
      aiPredictionResponse.substring(0, 100) + "..."
    );

    // For now, create a simple AI prediction based on the prompt
    // In the future, we could parse the AI response to extract structured data
    const predictionData = {
      title: `[AI] ${prompt.substring(0, 60)}...`,
      description: `AI-generated prediction based on: ${prompt}`,
      targetDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      targetValue: 1000, // Default target value
      category: 0, // FITNESS category
      network: network,
      emoji: "🤖",
      autoResolvable: true, // AI predictions are auto-resolvable
    };

    // Get contract address based on network
    const contractAddress =
      network === "celo"
        ? "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F" // CELO contract
        : "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB"; // Base prediction market (SweatEquityBot compatible)

    // Prepare function arguments with proper type conversions
    const args = [
      predictionData.title,
      predictionData.description,
      BigInt(predictionData.targetDate),
      BigInt(predictionData.targetValue),
      Number(predictionData.category),
      predictionData.network,
      predictionData.emoji,
      Boolean(predictionData.autoResolvable),
    ];

    console.log("⚡ Creating prediction autonomously via AgentKit...");

    // Use AgentKit to autonomously create the prediction
    const result = await agentKit.executeGaslessTransaction(
      contractAddress,
      "createPrediction",
      args,
      await agentKit.getWalletAddress()
    );

    if (result.success) {
      console.log("✅ AI prediction created autonomously:", result.txHash);

      return res.status(200).json({
        success: true,
        message: "AI prediction created autonomously",
        txHash: result.txHash,
        prediction: {
          title: predictionData.title,
          description: predictionData.description,
          targetDate: predictionData.targetDate,
          targetValue: predictionData.targetValue,
          network: predictionData.network,
          emoji: predictionData.emoji,
        },
        autonomous: true,
      });
    } else {
      console.error("❌ Failed to create AI prediction:", result.error);

      return res.status(500).json({
        success: false,
        error: result.error || "Failed to create AI prediction autonomously",
      });
    }
  } catch (error) {
    console.error("❌ AI prediction creation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
