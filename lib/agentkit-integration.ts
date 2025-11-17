/**
 * Coinbase AgentKit Integration for XMTP Prediction Bot
 * Integrates CDP AgentKit for enhanced blockchain operations
 *
 * Features:
 * - Gasless transactions via CDP
 * - Multi-chain wallet management
 * - Enhanced DeFi operations
 * - Basenames integration
 */

// AgentKit imports - SERVER SIDE ONLY
let AgentKit: any;

// Only load AgentKit on server side to prevent build issues
if (typeof window === "undefined") {
  try {
    const agentkit = require("@coinbase/agentkit");
    AgentKit = agentkit.AgentKit;
    console.log("✅ AgentKit core loaded successfully (server-side)");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("⚠️ AgentKit not available:", errorMessage);
  }
} else {
  console.log("⚠️ AgentKit skipped on client-side");
}

// AgentKit configuration
interface AgentKitConfig {
  openaiApiKey: string;
  cdpApiKeyName?: string;
  cdpApiKeyPrivateKey?: string;
  networkId?: string;
}

// Enhanced prediction data with AgentKit capabilities
interface AgentKitPredictionData {
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  category: number;
  network: string;
  emoji: string;
  autoResolvable: boolean;
  // AgentKit enhancements
  walletAddress?: string;
  baseName?: string;
  tokenSymbol?: string;
  gaslessTransaction?: boolean;
}

export class AgentKitPredictionBot {
  private agentkit: any;
  private agent: any;
  private config: AgentKitConfig;
  private isAgentKitAvailable: boolean;

  constructor(config: AgentKitConfig) {
    this.config = config;
    // Check availability dynamically during initialization
    this.isAgentKitAvailable = false;
  }

  /**
   * Initialize the AgentKit integration
   */
  async initialize(): Promise<void> {
    try {
      // Check if essential AgentKit dependencies are available
      if (!AgentKit) {
        console.log("⚠️ AgentKit core not available. Using fallback mode.");
        this.isAgentKitAvailable = false;
        return;
      }

      console.log("🚀 Initializing Coinbase AgentKit...");
      this.isAgentKitAvailable = true;

      // Initialize CDP AgentKit - try environment variables first
      console.log(`🔧 Using CDP credentials: ${this.config.cdpApiKeyName}`);

      try {
        // Method 1: Use CDP wallet provider (new AgentKit v2 approach)
        const { CdpWalletProvider } = await import("@coinbase/agentkit");

        const walletProvider = await CdpWalletProvider.configureWithWallet({
          apiKeyName: this.config.cdpApiKeyName,
          apiKeyPrivateKey: this.config.cdpApiKeyPrivateKey,
          networkId: this.config.networkId || "base-sepolia",
        });

        // Use the correct AgentKit constructor pattern
        this.agentkit = new AgentKit({ walletProvider });
        console.log("✅ AgentKit initialized with CDP wallet provider");

        // Get wallet address
        const address = await walletProvider.getAddress();
        console.log(`📧 Wallet Address: ${address}`);

        // Get available actions
        const actions = this.agentkit.getActions();
        console.log(`🔧 Available actions: ${actions.length}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`⚠️ AgentKit initialization failed: ${errorMessage}`);
        throw error;
      }

      // For buildathon, use core AgentKit functionality
      console.log("✅ Using core AgentKit mode for buildathon");

      // Store the AgentKit instance for basic operations
      this.agent = this.agentkit;

      console.log("✅ AgentKit initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to initialize AgentKit:", errorMessage);
      console.log("⚠️ AgentKit will run in fallback mode without CDP features");
      this.isAgentKitAvailable = false;
      // Don't throw error - allow fallback mode
    }
  }

  /**
   * Process a message using AgentKit capabilities
   */
  async processMessage(message: string, userAddress?: string): Promise<string> {
    try {
      if (!this.isAgentKitAvailable) {
        return "AgentKit is not available. Please configure CDP credentials for enhanced features.";
      }

      if (!this.agent) {
        throw new Error("AgentKit not initialized. Call initialize() first.");
      }

      // Enhanced message processing for prediction intents
      const enhancedMessage = userAddress
        ? `[User: ${userAddress}] ${message}`
        : message;

      console.log(`🤖 Processing message with AgentKit: ${enhancedMessage}`);

      // Check if this is a prediction intent
      const isPredictionIntent =
        message.toLowerCase().includes("predict") ||
        message.toLowerCase().includes("will do") ||
        message.toLowerCase().includes("by") ||
        message.toLowerCase().includes("sweat equity") ||
        message.toLowerCase().includes("fitness");

      if (isPredictionIntent) {
        return await this.generatePredictionProposal(message, userAddress);
      }

      // Get available actions from AgentKit
      const actions = this.agent.getActions();
      console.log(`🔧 Available AgentKit actions: ${actions.length}`);

      // For non-prediction messages, return helpful guidance
      return `🤖 **SweatEquityBot AI Assistant Ready!** (${actions.length} actions available)\n\n💬 **Try saying:**\n• "I predict I'll do 500 pushups by March 15th"\n• "Create a fitness challenge with sweat equity"\n• "What SweatEquityBot predictions are live?"\n\n💡 **Revolutionary Features:**\n• 80% stake recovery through exercise\n• AI-enhanced fitness predictions\n• Cross-chain exercise verification\n• Automatic address resolution`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ AgentKit processing error:", errorMessage);
      return `I encountered an error processing your request: ${errorMessage}. Please try again.`;
    }
  }

  /**
   * Generate a structured prediction proposal using AI with external data enhancement
   */
  async generatePredictionProposal(
    message: string,
    userAddress?: string
  ): Promise<string> {
    try {
      // First, check for wallet addresses/usernames in the message
      const addressValidation = await this.validateAndResolveAddresses(message);

      if (!addressValidation.isValid) {
        return addressValidation.errorMessage;
      }

      // Enhance with external data context
      const externalContext = await this.gatherExternalDataContext(message);

      // Use OpenAI for structured prediction parsing
      const openaiApiKey = this.config.openaiApiKey;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `You are an AI assistant for SweatEquityBot - the world's first fitness-backed prediction market where users can recover 80% of lost stakes through verified exercise. Parse user messages into structured prediction proposals.

IMPORTANT: Always respond with a structured prediction proposal that includes:
1. A clear, concise title (max 80 characters)
2. A detailed description
3. Target date (parse from user input, default to 30 days if unclear)
4. Target value (number of reps/exercises)
5. Network: Always use "base" for Base Sepolia
6. A wallet trigger comment for the frontend with proper chainId

CRITICAL DATE HANDLING:
- Current date: ${new Date().toISOString().split("T")[0]}
- For "October 1st, 2025" use timestamp: ${Math.floor(
                  new Date("2025-10-01").getTime() / 1000
                )}
- For "March 15th, 2025" use timestamp: ${Math.floor(
                  new Date("2025-03-15").getTime() / 1000
                )}
- Always ensure the timestamp is in the future (> ${Math.floor(
                  Date.now() / 1000
                )})

EXTERNAL DATA INTEGRATION:
- Weather predictions: Use OPENWEATHER_API_KEY for location-based weather data
- Crypto predictions: Real-time prices from CoinGecko/Binance APIs (BTC, ETH, CELO)
- Timezone handling: TIMEZONEDB_API_KEY for accurate timezone conversion
- Auto-resolvable: Mark predictions as auto-resolvable when external data is available
- Enhanced validation: Use external APIs to validate prediction feasibility

Format your response EXACTLY like this:
**🎯 Prediction Proposal**

**Title:** [Clear title under 80 chars]
**Description:** [Detailed description of the fitness goal]
**Target Date:** [Date in format: March 15, 2025]
**Target Value:** [Number] [exercise type]
**Network:** Base Sepolia or CELO Mainnet
**Estimated Cost:** Small gas fee (paid by your wallet)

💡 **Revolutionary SweatEquityBot Features:**
• 80% stake recovery through exercise
• AI-enhanced fitness predictions
• Cross-chain exercise verification
• Automatic address resolution

<!-- WALLET_TRIGGER:{"title":"[title]","description":"[description]","targetDate":[unix_timestamp],"targetValue":[number],"category":0,"network":"base","chainId":8453,"emoji":"💪","autoResolvable":true,"targetAddress":"${
                  addressValidation.resolvedAddress
                }","contractAddress":"0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB"} -->

Ready to create your prediction?`,
              },
              {
                role: "user",
                content: `${message}\n\nResolved addresses: ${JSON.stringify(
                  addressValidation.resolvedAddresses
                )}\n\nExternal data context: ${JSON.stringify(
                  externalContext
                )}`,
              },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse =
        data.choices[0]?.message?.content ||
        "Failed to generate prediction proposal";

      console.log(
        "✅ Generated structured prediction proposal via AgentKit + OpenAI"
      );
      return aiResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Prediction proposal generation failed:", errorMessage);

      // Fallback to basic structured response
      return await this.generateFallbackPredictionProposal(message);
    }
  }

  /**
   * Gather external data context for enhanced predictions
   */
  private async gatherExternalDataContext(message: string): Promise<any> {
    const context: any = {
      weather: null,
      crypto: null,
      timezone: null,
      location: null,
      dateValidation: null,
    };

    try {
      // Check for weather-related predictions
      const weatherMatch = message.match(
        /weather|rain|snow|sunny|temperature|degrees?/i
      );
      const locationMatch = message.match(
        /(?:in|at)\s+([a-zA-Z\s]+?)(?:\s|$|,)/i
      );

      if (weatherMatch && locationMatch) {
        const { getWeatherData } = await import(
          "./services/external-data-service"
        );
        const location = locationMatch[1].trim();
        context.weather = await getWeatherData(location);
      }

      // Check for crypto-related predictions
      const cryptoMatch = message.match(
        /\b(BTC|ETH|CELO|bitcoin|ethereum|crypto|price)\b/i
      );
      if (cryptoMatch) {
        const { getCryptoPriceData } = await import(
          "./services/external-data-service"
        );
        const symbol = cryptoMatch[1].toLowerCase();
        const cryptoSymbol =
          symbol === "bitcoin" ? "btc" : symbol === "ethereum" ? "eth" : symbol;
        context.crypto = await getCryptoPriceData(cryptoSymbol);
      }

      // Enhanced date parsing with timezone
      const dateMatch = message.match(/(by|until|before)\s+([^,\n]+)/i);
      if (dateMatch) {
        const { parseNaturalDate } = await import(
          "./services/timezone-service"
        );
        context.dateValidation = await parseNaturalDate(dateMatch[2].trim());
      }

      // Location context for timezone
      if (locationMatch) {
        const { getLocationFromName } = await import(
          "./services/location-context-service"
        );
        context.location = await getLocationFromName(locationMatch[1].trim());
      }
    } catch (error) {
      console.warn("External data context gathering failed:", error);
    }

    return context;
  }

  /**
   * Validate and resolve wallet addresses/usernames in the message
   */
  private async validateAndResolveAddresses(message: string): Promise<{
    isValid: boolean;
    errorMessage: string;
    resolvedAddress?: string;
    resolvedAddresses: Record<string, string>;
  }> {
    try {
      // Extract potential addresses/usernames from message
      const basenameMatch = message.match(/([a-zA-Z0-9-]+\.base\.eth)/gi);
      const ensMatch = message.match(/([a-zA-Z0-9-]+\.eth)/gi);
      const addressMatch = message.match(/(0x[a-fA-F0-9]{40})/gi);

      const resolvedAddresses: Record<string, string> = {};
      let targetAddress = "";

      // Resolve Basenames
      if (basenameMatch) {
        for (const basename of basenameMatch) {
          try {
            const { resolveUsernameForPrediction } = await import(
              "./basenames-integration"
            );
            const resolved = await resolveUsernameForPrediction(basename);

            if (resolved.address) {
              resolvedAddresses[basename] = resolved.address;
              targetAddress = resolved.address;
              console.log(`✅ Resolved ${basename} to ${resolved.address}`);
            } else {
              return {
                isValid: false,
                errorMessage: `❌ **Address Resolution Failed**\n\nCould not resolve **${basename}** to a wallet address.\n\n**Please:**\n• Check the spelling of the Basename\n• Ensure the Basename is registered\n• Or provide a wallet address (0x...) instead\n\n**Example:** "I predict 0x1234...5678 will do 500 pushups by March 15th"`,
                resolvedAddresses,
              };
            }
          } catch (error) {
            console.error(`❌ Failed to resolve ${basename}:`, error);
            return {
              isValid: false,
              errorMessage: `❌ **Address Resolution Error**\n\nFailed to resolve **${basename}**.\n\n**Please try:**\n• Using a wallet address (0x...) instead\n• Checking your internet connection\n• Trying again in a moment`,
              resolvedAddresses,
            };
          }
        }
      }

      // Handle ENS names (similar to Basenames)
      if (ensMatch && !basenameMatch) {
        for (const ensName of ensMatch) {
          if (!ensName.endsWith(".base.eth")) {
            try {
              const { resolveUsernameForPrediction } = await import(
                "./basenames-integration"
              );
              const resolved = await resolveUsernameForPrediction(ensName);

              if (resolved.address) {
                resolvedAddresses[ensName] = resolved.address;
                targetAddress = resolved.address;
              } else {
                return {
                  isValid: false,
                  errorMessage: `❌ **ENS Resolution Failed**\n\nCould not resolve **${ensName}** to a wallet address.\n\n**Please:**\n• Use a .base.eth name for better compatibility\n• Or provide a wallet address (0x...) instead`,
                  resolvedAddresses,
                };
              }
            } catch (error) {
              return {
                isValid: false,
                errorMessage: `❌ **ENS Resolution Error**\n\nFailed to resolve **${ensName}**.\n\n**Please use a wallet address (0x...) or .base.eth name instead.**`,
                resolvedAddresses,
              };
            }
          }
        }
      }

      // Handle direct wallet addresses
      if (addressMatch) {
        const address = addressMatch[0];
        resolvedAddresses[address] = address;
        targetAddress = address;
      }

      // Check if we have a target address for the prediction
      if (!targetAddress) {
        return {
          isValid: false,
          errorMessage: `❌ **Missing Target Address**\n\nTo create a resolvable prediction, please specify:\n\n**Option 1:** Basename\n• "I predict **papajams.base.eth** will do 500 pushups..."\n\n**Option 2:** Wallet Address\n• "I predict **0x1234...5678** will do 500 pushups..."\n\n**Option 3:** Self-prediction\n• "I predict **I** will do 500 pushups..." (uses your wallet)`,
          resolvedAddresses,
        };
      }

      return {
        isValid: true,
        errorMessage: "",
        resolvedAddress: targetAddress,
        resolvedAddresses,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Address validation failed:", errorMessage);

      return {
        isValid: false,
        errorMessage: `❌ **Address Validation Error**\n\nFailed to validate addresses in your message.\n\n**Please try:**\n• Using a clear format: "I predict [address/name] will do [number] [exercise] by [date]"\n• Providing a wallet address (0x...) or .base.eth name`,
        resolvedAddresses: {},
      };
    }
  }

  /**
   * Generate a fallback prediction proposal with enhanced parsing
   */
  private async generateFallbackPredictionProposal(
    message: string
  ): Promise<string> {
    // Parse basic info from message
    const exerciseMatch = message.match(
      /(\d+)\s*(pushups?|pressups?|situps?|squats?|pullups?)/i
    );
    const dateMatch = message.match(/(by|until)\s*([^,\n]+)/i);

    const targetValue = exerciseMatch ? parseInt(exerciseMatch[1]) : 100;
    const exerciseType = exerciseMatch
      ? exerciseMatch[2].toLowerCase()
      : "exercises";
    const dateStr = dateMatch ? dateMatch[2].trim() : "30 days from now";

    // Calculate target date with better parsing
    let targetDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Default to 30 days

    if (dateMatch) {
      try {
        // Use enhanced date parsing service
        const { parseNaturalDate } = await import(
          "./services/timezone-service"
        );
        const parsedResult = await parseNaturalDate(dateMatch[2].trim());

        if (parsedResult.timestamp > Math.floor(Date.now() / 1000)) {
          targetDate = parsedResult.timestamp;
        }
      } catch (error) {
        console.log("Enhanced date parsing failed, using fallback");

        // Fallback to simple parsing
        const dateText = dateMatch[2].trim();
        let parsedDate: Date;

        if (dateText.includes("october") || dateText.includes("oct")) {
          parsedDate = new Date("2025-10-01");
        } else if (dateText.includes("march") || dateText.includes("mar")) {
          parsedDate = new Date("2025-03-15");
        } else {
          parsedDate = new Date(dateText);
        }

        if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now()) {
          targetDate = Math.floor(parsedDate.getTime() / 1000);
        }
      }
    }

    const title = `${targetValue} ${exerciseType} challenge`;
    const description = `Complete ${targetValue} ${exerciseType} ${dateStr}`;

    return `**🎯 Prediction Proposal** (AgentKit Generated)

**Title:** ${title}
**Description:** ${description}
**Target Date:** ${dateStr}
**Target Value:** ${targetValue} ${exerciseType}
**Network:** Base Sepolia or CELO Mainnet
**Estimated Cost:** Small gas fee (paid by your wallet)

💡 **Revolutionary SweatEquityBot Features:**
• 80% stake recovery through exercise
• AI-enhanced fitness predictions
• Cross-chain exercise verification
• Automatic address resolution

<!-- WALLET_TRIGGER:{"title":"${title}","description":"${description}","targetDate":${targetDate},"targetValue":${targetValue},"category":0,"network":"base","chainId":8453,"emoji":"💪","autoResolvable":false,"contractAddress":"0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB"} -->

Ready to create your prediction?`;
  }

  /**
   * Execute a gasless transaction using AgentKit
   */
  async executeGaslessTransaction(
    contractAddress: string,
    functionName: string,
    args: any[],
    userAddress: string,
    abiOverride?: ReadonlyArray<any>
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.isAgentKitAvailable || !this.agentkit) {
        throw new Error("AgentKit not available for gasless transactions");
      }

      console.log("⚡ Executing gasless transaction via AgentKit...");
      console.log(`📋 Contract: ${contractAddress}`);
      console.log(`🔧 Function: ${functionName}`);
      console.log(`📝 Args:`, args);

      // Use AgentKit's wallet provider to execute the transaction
      const walletProvider = this.agentkit.walletProvider;
      if (!walletProvider) {
        throw new Error("CDP wallet provider not available");
      }

      console.log("🔍 Wallet provider available:", !!walletProvider);
      console.log(
        "🔍 Wallet provider methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(walletProvider))
      );

      // Check if sendTransaction method exists
      if (!walletProvider.sendTransaction) {
        throw new Error(
          "sendTransaction method not available on wallet provider"
        );
      }

      // Import contract ABI and ethers for contract interaction
      const { ethers } = await import("ethers");
      let abi: ReadonlyArray<any> | undefined = abiOverride;
      if (!abi) {
        const { unifiedPredictionMarketABI } = await import(
          "./unified-prediction-market-abi"
        );
        abi = unifiedPredictionMarketABI as ReadonlyArray<any>;
      }
      const contractInterface = new ethers.Interface(abi as any);
      const encodedData = contractInterface.encodeFunctionData(
        functionName,
        args
      );

      console.log(`📝 Encoded data: ${encodedData.substring(0, 100)}...`);

      // Execute the transaction using sendTransaction
      console.log("🚀 Attempting to send transaction...");
      console.log("📋 Transaction params:", {
        to: contractAddress,
        data: encodedData.substring(0, 100) + "...",
        value: "0",
      });

      const result = await walletProvider.sendTransaction({
        to: contractAddress,
        data: encodedData,
        value: "0",
      });

      console.log("✅ Gasless transaction executed successfully");
      console.log("📄 Full result:", JSON.stringify(result, null, 2));
      console.log("🔍 Result type:", typeof result);
      console.log("🔍 Result keys:", Object.keys(result || {}));

      // Handle different possible result formats
      let txHash = "";
      if (result) {
        txHash =
          result.transactionHash ||
          result.hash ||
          result.txHash ||
          result.tx_hash ||
          "";

        // If result is a string, it might be the hash directly
        if (typeof result === "string") {
          txHash = result;
        }

        // If result has a wait method, it might be a transaction response
        if (result.wait && typeof result.wait === "function") {
          console.log("⏳ Waiting for transaction confirmation...");
          const receipt = await result.wait();
          txHash = receipt.transactionHash || receipt.hash || txHash;
        }
      }

      if (!txHash) {
        console.warn(
          "⚠️ No transaction hash found in result, but transaction may have succeeded"
        );
        console.log("📄 Attempting to extract hash from result:", result);
      }

      return {
        success: true,
        txHash: txHash || "unknown",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Gasless transaction failed:", errorMessage);
      console.error("❌ Error details:", error);
      console.error(
        "❌ Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );

      // Log more details about the error
      if (error && typeof error === "object") {
        console.error("❌ Error object keys:", Object.keys(error));
        console.error("❌ Error JSON:", JSON.stringify(error, null, 2));
      }

      // Check for specific error types
      let userFriendlyError = errorMessage;
      if (error && typeof error === "object" && "apiCode" in error) {
        const apiError = error as any;
        if (apiError.apiCode === "insufficient_balance") {
          userFriendlyError =
            "CDP wallet has insufficient balance for gasless transaction. Please try using your regular wallet instead.";
        }
      }

      return {
        success: false,
        error:
          userFriendlyError ||
          "Unknown error occurred during gasless transaction",
      };
    }
  }

  /**
   * Get wallet address for autonomous actions
   */
  async getWalletAddress(): Promise<string> {
    if (!this.agentkit?.walletProvider) {
      throw new Error("AgentKit wallet provider not available");
    }
    return await this.agentkit.walletProvider.getAddress();
  }

  /**
   * Create a prediction with AgentKit enhancements (DEPRECATED - use for autonomous actions only)
   */
  async createPredictionWithAgentKit(
    predictionData: AgentKitPredictionData,
    userAddress: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    gasless?: boolean;
    suggestFallback?: boolean;
  }> {
    try {
      console.log("🔄 Creating prediction with AgentKit enhancements...");

      // Check if we can use gasless transactions
      const canUseGasless =
        predictionData.network === "base" && predictionData.gaslessTransaction;

      if (canUseGasless) {
        console.log("⚡ Using gasless transaction via CDP...");

        // Get contract address for Base Sepolia
        const { CHAIN_CONFIG } = await import("./services/dual-chain-service");
        const contractAddress = CHAIN_CONFIG.base.contractAddress;

        // Prepare function arguments with proper type conversions
        const args = [
          predictionData.title,
          predictionData.description,
          BigInt(predictionData.targetDate),
          BigInt(predictionData.targetValue),
          Number(predictionData.category), // Convert to Number for uint8
          predictionData.network,
          predictionData.emoji,
          Boolean(predictionData.autoResolvable), // Convert to Boolean
        ];

        console.log(
          "🔍 AgentKit args with types:",
          args.map((arg, i) => ({
            index: i,
            value: arg,
            type: typeof arg,
            constructor: arg?.constructor?.name,
          }))
        );

        // Execute gasless transaction
        const result = await this.executeGaslessTransaction(
          contractAddress,
          "createPrediction",
          args,
          userAddress
        );

        // If gasless transaction fails due to insufficient balance, suggest fallback
        if (!result.success && result.error?.includes("insufficient balance")) {
          console.log(
            "💡 AgentKit gasless transaction failed due to insufficient balance, suggesting wallet fallback"
          );
          return {
            success: false,
            error:
              "AgentKit wallet has insufficient balance for gasless transaction. Please use your regular wallet instead by selecting 'Use Wallet' option.",
            gasless: false,
            suggestFallback: true,
          };
        }

        return {
          success: result.success,
          txHash: result.txHash,
          error: result.error,
          gasless: true,
        };
      } else {
        // Fall back to regular transaction
        console.log("💰 Using regular transaction...");

        // Import dual-chain service for regular transactions
        const { createChainPrediction } = await import("./services/dual-chain-service");
        const { ethers } = await import("ethers");

        // Create provider and signer
        const provider = new ethers.JsonRpcProvider(
          predictionData.network === "celo"
            ? "https://celo-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
            : "https://mainnet.base.org"
        );

        const botPrivateKey =
          process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
        if (!botPrivateKey) {
          throw new Error("Bot private key not configured");
        }

        const botWallet = new ethers.Wallet(botPrivateKey, provider);

        const result = await createChainPrediction(
          predictionData.network as "celo" | "base",
          predictionData,
          botWallet
        );

        return {
          success: result.success,
          txHash: result.txHash,
          error: result.error,
          gasless: false,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ AgentKit prediction creation error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Resolve Basename to address
   */
  async resolveBasename(basename: string): Promise<string | null> {
    try {
      const message = `Resolve the Basename "${basename}" to its wallet address on Base network.`;
      const response = await this.processMessage(message);

      // Extract address from response
      const addressMatch = response.match(/0x[a-fA-F0-9]{40}/);
      return addressMatch ? addressMatch[0] : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Basename resolution error:", errorMessage);
      return null;
    }
  }

  /**
   * Get wallet balance using AgentKit
   */
  async getWalletBalance(
    address: string,
    tokenSymbol: string = "ETH"
  ): Promise<string | null> {
    try {
      const message = `Check the ${tokenSymbol} balance for wallet address ${address} on Base Sepolia.`;
      const response = await this.processMessage(message);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Balance check error:", errorMessage);
      return null;
    }
  }

  // Removed duplicate getWalletAddress method - using the one above

  /**
   * Check if AgentKit is initialized
   */
  isInitialized(): boolean {
    return this.isAgentKitAvailable && !!this.agent && !!this.agentkit;
  }

  /**
   * Check if AgentKit is available
   */
  get agentKitAvailable(): boolean {
    return this.isAgentKitAvailable;
  }
}

// Singleton instance
let agentKitInstance: AgentKitPredictionBot | null = null;

/**
 * Get or create AgentKit instance
 */
export async function getAgentKitInstance(): Promise<AgentKitPredictionBot> {
  if (!agentKitInstance) {
    const config: AgentKitConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      cdpApiKeyName: process.env.CDP_API_KEY_NAME,
      cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      networkId: "base-mainnet",
    };

    agentKitInstance = new AgentKitPredictionBot(config);
    await agentKitInstance.initialize();
  }

  return agentKitInstance;
}

/**
 * Enhanced prediction proposal with AgentKit
 */
export async function generateAgentKitPredictionProposal(
  userMessage: string,
  userAddress?: string
): Promise<string> {
  try {
    const agentKit = await getAgentKitInstance();

    const enhancedMessage = `
User wants to create a prediction: "${userMessage}"

Please help them create a structured prediction proposal with:
1. Clear title (max 80 characters)
2. Detailed description
3. Target date and value
4. Appropriate network (Base Sepolia for demos, CELO for production)
5. Whether to use gasless transactions (if on Base)

Format the response as a prediction proposal that's ready to create.
    `;

    return await agentKit.processMessage(enhancedMessage, userAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ AgentKit prediction proposal error:", errorMessage);
    return `I encountered an error generating your prediction proposal. Please try again or create the prediction manually.`;
  }
}
