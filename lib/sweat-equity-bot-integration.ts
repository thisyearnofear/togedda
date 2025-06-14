import { ethers } from "ethers";

/**
 * SweatEquityBot Integration with AgentKit
 * Handles autonomous verification and approval of sweat equity challenges
 */

// SweatEquityBot ABI (key functions)
const SWEAT_EQUITY_BOT_ABI = [
  "function createSweatEquityChallenge(uint256 predictionId, uint8 exerciseType, uint256 targetAmount) external",
  "function submitVerification(uint256 challengeId, string memory verificationMethod, string memory proofHash) external",
  "function approveSweatEquity(uint256 challengeId) external",
  "function claimSweatEquity(uint256 challengeId) external",
  "function getUserChallenges(address user) external view returns (uint256[] memory)",
  "function getChallenge(uint256 challengeId) external view returns (tuple(uint256 predictionId, address user, uint256 stakeAmount, uint256 deadline, bool completed, bool claimed, uint8 exerciseType, uint256 targetAmount, string verificationMethod, string proofHash, uint256 createdAt))",
  "function canCreateSweatEquity(uint256 predictionId, address user) external view returns (bool)",
  "function sweatEquityScore(address user) external view returns (uint256)",
  "function streakCount(address user) external view returns (uint256)",
  "event SweatEquityChallengeCreated(uint256 indexed challengeId, uint256 indexed predictionId, address indexed user, uint256 stakeAmount, uint8 exerciseType, uint256 targetAmount)",
  "event SweatEquityCompleted(uint256 indexed challengeId, address indexed user, string proofHash, uint256 timestamp)",
  "event VerificationSubmitted(uint256 indexed challengeId, string verificationMethod, string proofHash)",
];

// Contract addresses
const SWEAT_EQUITY_BOT_ADDRESSES = {
  "base-mainnet": "0x89ED0a9739801634A61e791aB57ADc3298B685e9", // Live SweatEquityBot on Base mainnet
  "base-sepolia": "", // Legacy testnet deployment
  "celo-mainnet": "", // Future deployment
};

export interface SweatEquityChallenge {
  predictionId: number;
  user: string;
  stakeAmount: string;
  deadline: number;
  completed: boolean;
  claimed: boolean;
  exerciseType: number;
  targetAmount: number;
  verificationMethod: string;
  proofHash: string;
  createdAt: number;
}

export interface VerificationProof {
  challengeId: number;
  method: "photo" | "video" | "wearable" | "community";
  proofHash: string;
  metadata?: {
    exerciseCount?: number;
    duration?: number;
    distance?: number;
    calories?: number;
    heartRate?: number;
  };
}

export class SweatEquityBotService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.Provider;
  private network: string;

  constructor(
    network: "base-mainnet" | "base-sepolia" | "celo-mainnet" = "base-mainnet"
  ) {
    this.network = network;

    // Initialize provider
    let rpcUrl: string;
    switch (network) {
      case "base-sepolia":
        rpcUrl = "https://sepolia.base.org";
        break;
      case "base-mainnet":
        rpcUrl = "https://mainnet.base.org";
        break;
      case "celo-mainnet":
        rpcUrl = "https://forno.celo.org";
        break;
      default:
        rpcUrl = "https://mainnet.base.org";
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize contract if address is available
    const contractAddress = SWEAT_EQUITY_BOT_ADDRESSES[network];
    if (contractAddress) {
      this.contract = new ethers.Contract(
        contractAddress,
        SWEAT_EQUITY_BOT_ABI,
        this.provider
      );
    }
  }

  /**
   * Set contract address after deployment
   */
  setContractAddress(address: string) {
    SWEAT_EQUITY_BOT_ADDRESSES[
      this.network as keyof typeof SWEAT_EQUITY_BOT_ADDRESSES
    ] = address;
    this.contract = new ethers.Contract(
      address,
      SWEAT_EQUITY_BOT_ABI,
      this.provider
    );
  }

  /**
   * Check if user can create sweat equity for a prediction
   */
  async canCreateSweatEquity(
    predictionId: number,
    userAddress: string
  ): Promise<boolean> {
    if (!this.contract) throw new Error("Contract not initialized");

    try {
      return await this.contract.canCreateSweatEquity(
        predictionId,
        userAddress
      );
    } catch (error) {
      console.error("Error checking sweat equity eligibility:", error);
      return false;
    }
  }

  /**
   * Get user's sweat equity challenges
   */
  async getUserChallenges(userAddress: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized");

    try {
      const challengeIds = await this.contract.getUserChallenges(userAddress);
      return challengeIds.map((id: any) => Number(id));
    } catch (error) {
      console.error("Error fetching user challenges:", error);
      return [];
    }
  }

  /**
   * Get challenge details
   */
  async getChallenge(
    challengeId: number
  ): Promise<SweatEquityChallenge | null> {
    if (!this.contract) throw new Error("Contract not initialized");

    try {
      const challenge = await this.contract.getChallenge(challengeId);
      return {
        predictionId: Number(challenge.predictionId),
        user: challenge.user,
        stakeAmount: challenge.stakeAmount.toString(),
        deadline: Number(challenge.deadline),
        completed: challenge.completed,
        claimed: challenge.claimed,
        exerciseType: Number(challenge.exerciseType),
        targetAmount: Number(challenge.targetAmount),
        verificationMethod: challenge.verificationMethod,
        proofHash: challenge.proofHash,
        createdAt: Number(challenge.createdAt),
      };
    } catch (error) {
      console.error("Error fetching challenge:", error);
      return null;
    }
  }

  /**
   * Get user's gamification stats
   */
  async getUserStats(
    userAddress: string
  ): Promise<{ score: number; streak: number }> {
    if (!this.contract) throw new Error("Contract not initialized");

    try {
      const [score, streak] = await Promise.all([
        this.contract.sweatEquityScore(userAddress),
        this.contract.streakCount(userAddress),
      ]);

      return {
        score: Number(score),
        streak: Number(streak),
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return { score: 0, streak: 0 };
    }
  }

  /**
   * Autonomous verification using AgentKit
   * This is where AgentKit shines - autonomous AI verification of exercise completion
   */
  async autonomousVerification(
    challengeId: number,
    proof: VerificationProof
  ): Promise<boolean> {
    try {
      console.log(
        `🤖 Starting autonomous verification for challenge ${challengeId}`
      );

      // Get AgentKit instance for autonomous verification
      const { getAgentKitInstance } = await import("./agentkit-integration");
      const agentKit = await getAgentKitInstance();

      if (!agentKit.isInitialized()) {
        console.warn("⚠️ AgentKit not available for autonomous verification");
        return false;
      }

      // Use AgentKit to analyze the verification proof
      const verificationPrompt = `
        Analyze this exercise verification proof for sweat equity challenge ${challengeId}:

        Method: ${proof.method}
        Proof Hash: ${proof.proofHash}
        Metadata: ${JSON.stringify(proof.metadata || {})}

        Determine if this proof demonstrates legitimate exercise completion.
        Consider factors like:
        - Proof authenticity
        - Exercise completion evidence
        - Metadata consistency
        - Fraud detection

        Respond with: APPROVE or REJECT with reasoning.
      `;

      const aiAnalysis = await agentKit.processMessage(verificationPrompt);
      const shouldApprove = aiAnalysis.toLowerCase().includes("approve");

      if (shouldApprove) {
        console.log(
          "✅ AI verification approved, executing autonomous approval..."
        );

        // Use AgentKit to autonomously approve the sweat equity
        const result = await agentKit.executeGaslessTransaction(
          SWEAT_EQUITY_BOT_ADDRESSES[
            this.network as keyof typeof SWEAT_EQUITY_BOT_ADDRESSES
          ],
          "approveSweatEquity",
          [challengeId],
          await agentKit.getWalletAddress()
        );

        if (result.success) {
          console.log(
            `🎉 Autonomous sweat equity approval successful: ${result.txHash}`
          );
          return true;
        } else {
          console.error("❌ Autonomous approval failed:", result.error);
          return false;
        }
      } else {
        console.log("❌ AI verification rejected the proof");
        return false;
      }
    } catch (error) {
      console.error("❌ Autonomous verification error:", error);
      return false;
    }
  }

  /**
   * Generate sweat equity challenge suggestions using AI
   */
  async generateChallengeRecommendations(
    userAddress: string,
    predictionId: number,
    stakeAmount: string
  ): Promise<
    {
      exerciseType: number;
      targetAmount: number;
      description: string;
      difficulty: "easy" | "medium" | "hard";
    }[]
  > {
    try {
      const { getAgentKitInstance } = await import("./agentkit-integration");
      const agentKit = await getAgentKitInstance();

      if (!agentKit.isInitialized()) {
        // Fallback recommendations
        return [
          {
            exerciseType: 0,
            targetAmount: 50,
            description: "50 Push-ups",
            difficulty: "medium",
          },
          {
            exerciseType: 1,
            targetAmount: 100,
            description: "100 Squats",
            difficulty: "medium",
          },
          {
            exerciseType: 2,
            targetAmount: 5000,
            description: "5km Run",
            difficulty: "hard",
          },
        ];
      }

      const prompt = `
        Generate personalized sweat equity challenge recommendations for a user who lost ${stakeAmount} ETH on prediction ${predictionId}.

        Create 3 exercise challenges with varying difficulty levels that would be fair and achievable within 24 hours:
        - Easy: Lower intensity, accessible to most fitness levels
        - Medium: Moderate challenge requiring some effort
        - Hard: Significant challenge for motivated individuals

        Exercise types: 0=pushups, 1=squats, 2=running(meters), 3=cycling(meters), 4=custom

        Format as JSON array with exerciseType, targetAmount, description, difficulty.
      `;

      const aiResponse = await agentKit.processMessage(prompt);

      // Try to parse AI response, fallback to defaults if parsing fails
      try {
        const recommendations = JSON.parse(aiResponse);
        return Array.isArray(recommendations) ? recommendations : [];
      } catch {
        // Fallback recommendations
        return [
          {
            exerciseType: 0,
            targetAmount: 30,
            description: "30 Push-ups (Easy)",
            difficulty: "easy" as const,
          },
          {
            exerciseType: 1,
            targetAmount: 75,
            description: "75 Squats (Medium)",
            difficulty: "medium" as const,
          },
          {
            exerciseType: 2,
            targetAmount: 3000,
            description: "3km Run (Hard)",
            difficulty: "hard" as const,
          },
        ];
      }
    } catch (error) {
      console.error("Error generating challenge recommendations:", error);
      return [];
    }
  }
}

// Export singleton instance (defaults to Base mainnet)
export const sweatEquityBotService = new SweatEquityBotService("base-mainnet");

// Export factory for different networks
export const createSweatEquityBotService = (
  network: "base-mainnet" | "base-sepolia" | "celo-mainnet"
) => {
  return new SweatEquityBotService(network);
};
