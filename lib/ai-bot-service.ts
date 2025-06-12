/**
 * AI Bot Service for Imperfect Form Prediction Market
 * This service handles the backend logic for the AI bot, including XMTP messaging integration
 * and interaction with the PredictionBot smart contract for proposing predictions.
 *
 * Updated to use XMTP V3 Node SDK following best practices from ephemeraHQ/xmtp-agent-examples
 */

import { config } from 'dotenv';
import { Client, type XmtpEnv } from '@xmtp/node-sdk';

// Load environment variables
config({ path: '.env.local' });
import { ethers } from 'ethers';
import { PREDICTION_BOT_ADDRESS } from './constants';
import axios from 'axios';
import {
  validateXMTPEnvironment,
  initializeXMTPClient
} from './xmtp-helpers';
import { CHAT_CONFIG, BOT_CONFIG } from './xmtp-constants';
import { getMarketSummaryForBot, getNetworkStatsForBot, getLiveMarketData } from './contract-data-service';
import { getChainSummaryForBot, recommendChainForUser, CHAIN_CONFIG } from './dual-chain-service';
import {
  validateExternalData,
  getCryptoPriceData,
  getWeatherData,
  getUserLocationFromIP
} from './services/external-data-service';
import { getLocationFromIP, getUserContext } from './services/location-context-service';

// AI model API configuration
const AI_MODEL_API = process.env.AI_MODEL_API || 'https://api.openai.com/v1/chat/completions';

// Conversation state management
interface ConversationState {
  lastPredictionProposal?: string;
  awaitingConfirmation?: boolean;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
}

// In-memory conversation state (in production, use Redis or database)
const conversationStates = new Map<string, ConversationState>();

/**
 * Get or create conversation state for a user
 */
function getConversationState(conversationId: string): ConversationState {
  if (!conversationStates.has(conversationId)) {
    conversationStates.set(conversationId, {
      conversationHistory: [],
      awaitingConfirmation: false
    });
  }
  return conversationStates.get(conversationId)!;
}

/**
 * Update conversation state
 */
function updateConversationState(conversationId: string, updates: Partial<ConversationState>): void {
  const state = getConversationState(conversationId);
  Object.assign(state, updates);
  conversationStates.set(conversationId, state);
}

/**
 * Add message to conversation history
 */
function addToConversationHistory(conversationId: string, role: 'user' | 'assistant', content: string): void {
  const state = getConversationState(conversationId);
  state.conversationHistory.push({
    role,
    content,
    timestamp: Date.now()
  });

  // Keep only last 10 messages to prevent memory bloat
  if (state.conversationHistory.length > 10) {
    state.conversationHistory = state.conversationHistory.slice(-10);
  }

  conversationStates.set(conversationId, state);
}

/**
 * Initialize the AI Bot's XMTP client using centralized helpers
 * @param privateKey The private key for the bot's wallet
 * @param encryptionKey The encryption key for local database
 * @param env The XMTP environment (dev, production, local)
 * @returns XMTP Client instance
 */
export async function initializeBotXMTPClient(
  privateKey: string,
  encryptionKey: string,
  env: XmtpEnv = 'dev'
): Promise<Client> {
  if (!privateKey) {
    throw new Error('Private key not provided for bot initialization');
  }

  return await initializeXMTPClient(privateKey, encryptionKey, env);
}

/**
 * Process incoming user messages and propose predictions using XMTP V3 streaming
 * @param client XMTP Client instance for the bot
 * @param messageHandler Function to handle incoming messages and generate prediction proposals
 */
export async function processUserMessages(
  client: Client,
  messageHandler: (message: any) => Promise<string>
): Promise<void> {
  console.log("✓ Syncing conversations...");
  await client.conversations.sync();
  console.log("✓ Waiting for messages...");

  // Stream all messages from the network using V3 SDK pattern
  const stream = await client.conversations.streamAllMessages();

  for await (const message of stream) {
    // Ignore messages from the same agent or non-text messages
    if (
      message?.senderInboxId.toLowerCase() === client.inboxId.toLowerCase() ||
      message?.contentType?.typeId !== "text"
    ) {
      continue;
    }

    console.log(
      `Received message: ${message.content as string} by ${message.senderInboxId}`
    );

    // Get the conversation from the local db
    const conversation = await client.conversations.getConversationById(
      message.conversationId
    );

    // If the conversation is not found, skip the message
    if (!conversation) {
      console.log("Unable to find conversation, skipping");
      continue;
    }

    try {
      const response = await messageHandler(message);
      if (response) {
        console.log(`Sending response: ${response}`);
        await conversation.send(response);
        console.log(`✓ Response sent successfully`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await conversation.send(
        "Sorry, I encountered an error processing your message."
      );
    }

    console.log("Waiting for messages...");
  }
}

/**
 * Process queued messages from the API endpoints
 * @param openaiApiKey The OpenAI API key for generating responses
 */
export async function processQueuedMessages(openaiApiKey: string): Promise<void> {
  console.log("🔄 Starting queued message processor...");

  // Import message queue functions
  const {
    getPendingMessages,
    markMessageProcessing,
    completeMessage,
    failMessage,
    cleanupOldMessages
  } = await import('./xmtp-message-queue');

  // Process messages at configured intervals
  setInterval(async () => {
    try {
      // Clean up old messages every minute
      cleanupOldMessages();

      const pendingMessages = getPendingMessages();

      if (pendingMessages.length > 0) {
        console.log(`📬 Processing ${pendingMessages.length} queued messages`);

        for (const queuedMessage of pendingMessages) {
          try {
            markMessageProcessing(queuedMessage.id);

            // Generate AI response
            const response = await generatePredictionProposal(queuedMessage.message, openaiApiKey);

            // Complete the message
            completeMessage(queuedMessage.id, response);

            console.log(`✅ Completed queued message ${queuedMessage.id}`);
          } catch (error) {
            console.error(`❌ Failed to process queued message ${queuedMessage.id}:`, error);
            failMessage(queuedMessage.id, error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in queued message processor:', error);
    }
  }, CHAT_CONFIG.QUEUE_CHECK_INTERVAL);
}

/**
 * Generate a prediction proposal based on user input using an AI model API
 * Enhanced with real-time contract data awareness and conversation state
 * @param userMessage The user's message content
 * @param apiKey The OpenAI API key
 * @param conversationId Optional conversation ID for state management
 * @returns A formatted prediction proposal or response
 */
export async function generatePredictionProposal(userMessage: string, apiKey: string, conversationId?: string): Promise<string> {
  console.log(`Generating prediction proposal for: ${userMessage}`);

  // Get conversation state if conversationId is provided
  const state = conversationId ? getConversationState(conversationId) : null;
  const lowerMessage = userMessage.toLowerCase();

  // Add user message to conversation history
  if (conversationId) {
    addToConversationHistory(conversationId, 'user', userMessage);
  }

  // Enhanced prediction intent detection
  const predictionKeywords = ['predict', 'think', 'bet', 'will do', 'will complete', 'will achieve', 'by ', 'target', 'goal'];
  const hasPredictionIntent = predictionKeywords.some(keyword => lowerMessage.includes(keyword));

  console.log(`Intent analysis - Message: "${userMessage}", Has prediction intent: ${hasPredictionIntent}`);

  // Handle confirmation responses
  if (state?.awaitingConfirmation && state.lastPredictionProposal) {
    if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage.includes('create')) {
      // User confirmed - create the prediction
      if (conversationId) {
        updateConversationState(conversationId, {
          awaitingConfirmation: false,
          lastPredictionProposal: undefined
        });
      }

      // Parse and validate the prediction with enhanced validation
      const { enhancedValidatePrediction, getValidationMessage } = await import('./prediction-validation');
      const { data: predictionData, validation, resolvedProfile } = await enhancedValidatePrediction(state.lastPredictionProposal);

      // Check if prediction is valid
      if (!validation.isValid) {
        const response = `❌ I found some issues with the prediction:\n\n${getValidationMessage(validation)}\n\nPlease provide a corrected version.`;

        if (conversationId) {
          updateConversationState(conversationId, {
            awaitingConfirmation: false,
            lastPredictionProposal: undefined
          });
          addToConversationHistory(conversationId, 'assistant', response);
        }
        return response;
      }

      try {
        // Create the prediction on the recommended chain
        const { createChainPrediction, recommendChainForUser } = await import('./dual-chain-service');
        const recommendedChain = recommendChainForUser({ isNewUser: true }); // Default to Base for hackathon

        // Set up bot wallet for the recommended chain
        const botPrivateKey = process.env.BOT_PRIVATE_KEY;
        if (!botPrivateKey) {
          throw new Error('Bot wallet not configured');
        }

        const { ethers } = await import('ethers');
        const { CHAIN_CONFIG } = await import('./dual-chain-service');
        const config = CHAIN_CONFIG[recommendedChain];
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        const botWallet = new ethers.Wallet(botPrivateKey, provider);

        // Create prediction on-chain
        const result = await createChainPrediction(
          recommendedChain,
          {
            title: predictionData.title || 'AI-Generated Prediction',
            description: predictionData.description || 'Prediction created via AI chat',
            targetDate: predictionData.targetDate || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
            targetValue: predictionData.targetValue || 0,
            category: predictionData.category || 3, // CUSTOM
            network: predictionData.network || recommendedChain,
            emoji: predictionData.emoji || '🔮',
            autoResolvable: false
          },
          botWallet
        );

        if (result.success) {
          const chainEmoji = config.emoji;
          const successResponse = `✅ Prediction created successfully on ${config.name}!\n\n**${predictionData.title || 'AI-Generated Prediction'}**\n\n${chainEmoji} Transaction: ${result.txHash}\n\nYour prediction is now live! Check the Live Markets tab to see it and start voting. Other users can participate by staking ${config.nativeCurrency.symbol}!`;

          if (conversationId) {
            addToConversationHistory(conversationId, 'assistant', successResponse);
          }
          return successResponse;
        } else {
          throw new Error(result.error || 'Unknown error creating prediction');
        }
      } catch (error: any) {
        console.error('Error creating prediction on-chain:', error);
        const errorResponse = `❌ I encountered an error creating your prediction on-chain: ${error.message}\n\nPlease try again or create the prediction manually in the Live Markets tab.`;

        if (conversationId) {
          addToConversationHistory(conversationId, 'assistant', errorResponse);
        }
        return errorResponse;
      }
    } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || lowerMessage.includes('edit')) {
      // User wants to edit or cancel
      if (conversationId) {
        updateConversationState(conversationId, {
          awaitingConfirmation: false,
          lastPredictionProposal: undefined
        });
      }

      const response = "No problem! Let's start over. What kind of prediction would you like to create? You can describe any fitness milestone, health goal, or blockchain-related prediction.";

      if (conversationId) {
        addToConversationHistory(conversationId, 'assistant', response);
      }
      return response;
    }
  }

  // Check for specific queries about live markets
  console.log(`Checking market query conditions for: "${lowerMessage}"`);

  // Handle live market queries
  if (lowerMessage.includes('live market') || lowerMessage.includes('what market') || lowerMessage.includes('current market')) {
    console.log(`🎯 Triggered market summary handler`);
    try {
      return await getMarketSummaryForBot();
    } catch (error) {
      console.error('Error getting market summary:', error);
      return "I'm having trouble accessing the current market data. Please try again in a moment.";
    }
  }

  // Handle network stats queries
  if (lowerMessage.includes('network stat') || lowerMessage.includes('fitness stat') || lowerMessage.includes('how many')) {
    console.log(`🎯 Triggered network stats handler`);
    try {
      return await getNetworkStatsForBot();
    } catch (error) {
      console.error('Error getting network stats:', error);
      return "I'm having trouble accessing the network fitness data. Please try again in a moment.";
    }
  }

  // Handle chain-specific queries (but not when user is making a prediction)
  const chainQueryKeywords = ['which chain', 'what chain', 'choose chain', 'which network', 'what network'];
  const hasChainQuery = chainQueryKeywords.some(keyword => lowerMessage.includes(keyword));

  if (hasChainQuery && !hasPredictionIntent) {
    console.log(`🎯 Triggered chain summary handler`);
    try {
      return await getChainSummaryForBot();
    } catch (error) {
      console.error('Error getting chain summary:', error);
      return "I support both CELO Mainnet (production) and Base Sepolia (hackathon testnet). Which would you like to use?";
    }
  }

  console.log(`✅ No hardcoded handlers triggered, proceeding to AI processing`);

  try {
    // Get current market context for AI (but not for prediction intents)
    let marketContext = '';
    if (!hasPredictionIntent) {
      try {
        const liveData = await getLiveMarketData();

        // Get resolution monitoring status
        const { getResolutionStatus } = await import('./services/prediction-resolution-service');
        const resolutionStatus = getResolutionStatus();

        // Get current crypto prices for context
        const btcPrice = await getCryptoPriceData('BTC');
        const ethPrice = await getCryptoPriceData('ETH');
        const celoPrice = await getCryptoPriceData('CELO');

        marketContext = `\n\nCurrent Market Context:
- ${liveData.activeMarkets} active prediction markets
- ${liveData.totalVolume.toFixed(2)} CELO total volume
- Recent activity: ${liveData.recentActivity.length} recent transactions
- Networks: ${liveData.networkStats.map(n => n.network).join(', ')}

Real-time Crypto Prices:
- Bitcoin (BTC): $${btcPrice?.price?.toLocaleString() || 'N/A'} (${btcPrice?.source || 'offline'})
- Ethereum (ETH): $${ethPrice?.price?.toLocaleString() || 'N/A'} (${ethPrice?.source || 'offline'})
- Celo (CELO): $${celoPrice?.price?.toFixed(3) || 'N/A'} (${celoPrice?.source || 'offline'})

Prediction Resolution Status:
- Monitoring: ${resolutionStatus.pending} auto-resolvable predictions
- Resolved: ${resolutionStatus.resolved} predictions completed
- Recent resolutions: ${resolutionStatus.recent.length} in queue`;
      } catch (error) {
        console.log('Could not fetch market context for AI');
      }
    } else {
      console.log('Skipping market context for prediction intent');
    }

    // Build conversation messages including history
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      {
        role: 'system',
        content: `You are an AI assistant for the Imperfect Form dual-chain prediction market platform.
        Your PRIMARY task is to recognize when users want to create predictions and help them do so.

        INTENT RECOGNITION - Look for these patterns:
        - "I predict..." / "I think..." / "I bet..."
        - "[Person] will do [action] by [date]"
        - Any statement about future outcomes with measurable targets
        - Questions about creating predictions

        Platform Details:
        - Deployed on CELO Mainnet (production) and Base Sepolia (hackathon testnet)
        - CELO: Real CELO tokens, 20% platform fee (15% to Greenpill Kenya charity, 5% maintenance)
        - Base: Test ETH, perfect for experimenting and hackathon demos
        - Focus on fitness, health, and blockchain-related predictions

        WHEN USER EXPRESSES A PREDICTION INTENT:
        1. IGNORE market information and focus ONLY on creating the prediction proposal
        2. NEVER respond with market statistics when a prediction is requested
        3. ALWAYS respond with a structured proposal in this EXACT format:
        "🔮 **Proposed Prediction:** [Clear title]

        📝 **Description:** [Detailed description]

        🎯 **Target:** [Specific measurable outcome by specific date]

        ⛓️ **Recommended Chain:** Base Sepolia (free test ETH, perfect for demos)

        Would you like to create this prediction?"

        2. Extract key details:
        - WHO: The person/entity making the prediction
        - WHAT: The specific action or outcome
        - WHEN: The deadline/target date
        - WHERE: Platform/network (default to Base Sepolia for demos)

        PLATFORM VERIFICATION REQUIREMENTS:
        - FITNESS PREDICTIONS: Must include ENS name (e.g., "vitalik.eth") or Farcaster username for verification
        - USER ACTIVITY: Must specify a user who can be tracked on the platform
        - BLOCKCHAIN DATA: Price predictions can be auto-resolved via external APIs (CoinGecko, Binance, etc.)
        - WEATHER PREDICTIONS: Must specify location (e.g., "rain in New York") - requires OPENWEATHER_API_KEY
        - LOCATION-BASED: Must include verifiable location names with timezone context
        - DATE/TIME: Always specify timezone when relevant (e.g., "by 5 PM EST") - uses TIMEZONEDB_API_KEY
        - MANUAL PREDICTIONS: Other predictions require manual resolution

        EXTERNAL DATA INTEGRATION:
        - Real-time crypto prices: BTC ($108,605), ETH ($2,771), CELO ($0.325) via CoinGecko API
        - Weather data: Available with API key for location-based predictions
        - Timezone parsing: Enhanced natural language date parsing with timezone awareness
        - Auto-resolution: Predictions marked as auto-resolvable will be resolved automatically when target date passes
        - Resolution confidence: External data sources provide confidence scores (crypto: 95%, weather: 85%)

        EXAMPLE USER INPUT: "i predict that dwr.eth will do 100 pressups on the platform on base sepolia by 1st August 2025"

        CORRECT RESPONSE:
        "🔮 **Proposed Prediction:** DWR.eth 100 Push-ups Challenge

        📝 **Description:** Prediction that dwr.eth will complete 100 push-ups on the Imperfect Form platform

        🎯 **Target:** 100 push-ups completed by August 1st, 2025 on Base Sepolia network

        ⛓️ **Recommended Chain:** Base Sepolia (free test ETH, perfect for demos)

        ✅ **Auto-Resolvable:** Yes (platform fitness data)

        Would you like to create this prediction?"

        CRITICAL: If the user message contains prediction keywords (predict, think, will do, by [date], etc.),
        you MUST respond with the structured prediction proposal format above.
        Do NOT provide market information when a prediction is being requested.

        For general questions only, provide helpful information.${marketContext}`
      }
    ];

    // Add conversation history if available
    if (state?.conversationHistory) {
      // Add recent conversation history (last 6 messages to stay within token limits)
      const recentHistory = state.conversationHistory.slice(-6);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    } else {
      // Add current user message if no conversation history
      const enhancedUserMessage = hasPredictionIntent
        ? `${userMessage}\n\n[SYSTEM: This appears to be a prediction request. Please respond with a structured prediction proposal using the exact format specified.]`
        : userMessage;

      messages.push({
        role: 'user',
        content: enhancedUserMessage
      });
    }

    console.log(`Making OpenAI API call with ${messages.length} messages`);
    console.log(`System prompt length: ${messages[0].content.length}`);
    console.log(`User message: ${messages[messages.length - 1].content}`);

    const response = await axios.post(
      AI_MODEL_API,
      {
        model: BOT_CONFIG.MODEL,
        messages,
        max_tokens: BOT_CONFIG.MAX_TOKENS,
        temperature: BOT_CONFIG.TEMPERATURE
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`OpenAI API response status: ${response.status}`);

    const aiResponse = response.data.choices[0].message.content;
    console.log(`AI model response: ${aiResponse}`);
    console.log(`Response type: ${typeof aiResponse}, length: ${aiResponse?.length}`);

    // Check if this is a prediction proposal and set awaiting confirmation state
    if (conversationId && aiResponse.toLowerCase().includes('proposed prediction') && aiResponse.toLowerCase().includes('would you like to create')) {
      updateConversationState(conversationId, {
        awaitingConfirmation: true,
        lastPredictionProposal: aiResponse
      });
    }

    // Add AI response to conversation history
    if (conversationId) {
      addToConversationHistory(conversationId, 'assistant', aiResponse);
    }

    return aiResponse;
  } catch (error) {
    console.error('Error calling AI model API:', error);
    return `I encountered an issue processing your request. Could you please clarify your prediction proposal? 🤔`;
  }
}

/**
 * Propose a prediction to the PredictionBot smart contract
 * @param predictionText The text of the prediction to propose
 * @param proposerAddress The address of the user proposing the prediction
 * @returns Transaction result or confirmation
 */
export async function proposePredictionToContract(predictionText: string, proposerAddress: string): Promise<any> {
  try {
    console.log(`Proposing prediction to contract: ${predictionText} by ${proposerAddress}`);
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');
    const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY || 'placeholder-key', provider);
    const contract = new ethers.Contract(PREDICTION_BOT_ADDRESS, [
      'function proposePrediction(string memory predictionText, address proposer) external returns (uint256 predictionId)'
    ], wallet);

    const tx = await contract.proposePrediction(predictionText, proposerAddress);
    const receipt = await tx.wait();
    console.log(`Prediction proposed successfully: ${receipt.transactionHash}`);
    return {
      status: 'success',
      message: `Prediction "${predictionText}" proposed successfully with transaction hash: ${receipt.transactionHash}`,
      transactionHash: receipt.transactionHash
    };
  } catch (error: any) {
    console.error('Error proposing prediction to contract:', error);
    return {
      status: 'error',
      message: `Failed to propose prediction: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Main function to start the AI bot service
 */
export async function startAIBotService(): Promise<void> {
  try {
    const env = validateXMTPEnvironment();

    const botClient = await initializeBotXMTPClient(
      env.BOT_PRIVATE_KEY,
      env.ENCRYPTION_KEY,
      env.XMTP_ENV
    );

    console.log(`🤖 AI Bot service started successfully!`);
    console.log(`📧 Environment: ${env.XMTP_ENV}`);
    console.log(`🆔 Inbox ID: ${botClient.inboxId}`);

    // Initialize prediction resolution system (on-demand)
    try {
      const { initializePredictionResolution } = await import('./services/prediction-resolution-service');
      await initializePredictionResolution();
      console.log(`🎯 Prediction resolution system ready (on-demand mode)`);
    } catch (error) {
      console.warn('⚠️ Failed to initialize prediction resolution:', error);
    }

    // Start processing both XMTP messages and queued messages
    await Promise.all([
      // Process direct XMTP messages
      processUserMessages(botClient, async (message) => {
        const proposal = await generatePredictionProposal(message.content, env.OPENAI_API_KEY || '');

        // Check if user wants to confirm a prediction
        if (proposal.toLowerCase().includes('confirm') || message.content.toLowerCase().includes('confirm')) {
          // Get the user's address from their inbox
          const inboxState = await botClient.preferences.inboxStateFromInboxIds([
            message.senderInboxId,
          ]);
          const userAddress = inboxState[0]?.identifiers[0]?.identifier;

          if (userAddress) {
            const contractResult = await proposePredictionToContract(proposal, userAddress);
            return `${proposal}\n\n${contractResult.message}`;
          }
        }

        return proposal;
      }),

      // Process queued messages from API
      processQueuedMessages(env.OPENAI_API_KEY || '')
    ]);
  } catch (error) {
    console.error('❌ Error starting AI Bot service:', error);
    throw error;
  }
}

/**
 * Generate encryption keys for development (re-export from helpers)
 */
export function generateKeys(): { privateKey: string; encryptionKey: string } {
  const { generateXMTPKeys } = require('./xmtp-helpers');
  const keys = generateXMTPKeys();
  return { privateKey: keys.privateKey, encryptionKey: keys.encryptionKey };
}

// If this file is run directly, start the service
if (require.main === module) {
  startAIBotService().catch((err) => {
    console.error('❌ Failed to start AI Bot service:', err);
    process.exit(1);
  });
}
