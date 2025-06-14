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
import axios from 'axios';
// AgentKit and Basenames integration
import { getAgentKitInstance, generateAgentKitPredictionProposal } from './agentkit-integration';
import { resolveUsernameForPrediction, formatResolutionForDisplay } from './basenames-integration';
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
      // Save the prediction proposal before clearing state
      const predictionProposal = state.lastPredictionProposal;

      if (conversationId) {
        updateConversationState(conversationId, {
          awaitingConfirmation: false,
          lastPredictionProposal: undefined
        });
      }

      // Parse prediction data with aggressive defaults - prioritize completion over perfection
      const predictionData = await parseAndCreatePredictionWithDefaults(predictionProposal);

      console.log('📊 Parsed prediction data:', predictionData);

      // Show what assumptions were made
      let validationInfo = '';
      const assumptions = [];

      if (predictionData.targetDate === Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)) {
        assumptions.push('Used default date: 30 days from now');
      }
      if (predictionData.targetValue === 0) {
        assumptions.push('No specific target value set');
      }
      if (predictionData.category === 3) {
        assumptions.push('Categorized as: Custom prediction');
      }

      if (assumptions.length > 0) {
        validationInfo = `\n\n📋 **Auto-filled:**\n${assumptions.map(a => `• ${a}`).join('\n')}`;
      }

      try {
        // Prepare transaction data for user's wallet to sign
        const { recommendChainForUser } = await import('./dual-chain-service');
        const recommendedChain = recommendChainForUser({ isNewUser: true }); // Default to Base for hackathon

        const { CHAIN_CONFIG } = await import('./dual-chain-service');
        const config = CHAIN_CONFIG[recommendedChain];

        // Prepare transaction parameters for user's wallet
        const transactionParams = {
          title: predictionData.title || 'AI-Generated Prediction',
          description: predictionData.description || 'Prediction created via AI chat',
          targetDate: predictionData.targetDate || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
          targetValue: predictionData.targetValue || 0,
          category: predictionData.category || 3, // CUSTOM
          network: predictionData.network || recommendedChain,
          emoji: predictionData.emoji || '🔮',
          autoResolvable: false,
          chain: recommendedChain,
          contractAddress: config.contractAddress,
          chainId: config.id
        };

        const chainEmoji = config.emoji;

        // Return response with embedded transaction data for immediate wallet trigger
        const walletTriggerResponse = `🚀 **Ready to Create Prediction!**\n\n**${transactionParams.title}**\n\n${chainEmoji} **Chain:** ${config.name}\n💰 **Gas:** ~$0.01\n\n⚡ **Sending to your wallet now...**\n\n_Please sign the transaction to create your prediction!_${validationInfo}\n\n<!-- WALLET_TRIGGER:${JSON.stringify(transactionParams)} -->`;

        if (conversationId) {
          addToConversationHistory(conversationId, 'assistant', walletTriggerResponse);
        }

        return walletTriggerResponse;
      } catch (error: any) {
        console.error('Error preparing prediction transaction:', error);
        const errorResponse = `❌ I encountered an error preparing your prediction: ${error.message}\n\nPlease try again or create the prediction manually in the Live Markets tab.`;

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
    // For prediction intents, try AgentKit first
    if (hasPredictionIntent) {
      console.log(`🤖 Using AgentKit for prediction intent`);
      try {
        // Extract user address from conversation context if available
        const userAddress = conversationId?.includes('wallet_')
          ? conversationId.split('wallet_')[1]?.split('_')[0]
          : undefined;

        const agentKitResponse = await generateAgentKitPredictionProposal(userMessage, userAddress);

        if (conversationId) {
          addToConversationHistory(conversationId, 'assistant', agentKitResponse);
        }

        return agentKitResponse;
      } catch (agentKitError) {
        console.error('AgentKit processing failed, falling back to standard AI:', agentKitError);
        // Fall through to standard AI processing
      }
    }

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

        ENHANCED CAPABILITIES:
        🤖 **AgentKit Integration**: Powered by Coinbase AgentKit for advanced blockchain operations
        🔵 **Basenames Support**: Resolve .base.eth names and ENS domains automatically
        ⚡ **Gasless Transactions**: Use CDP for gasless operations on Base Sepolia
        🌐 **Multi-Chain**: Support both CELO Mainnet and Base Sepolia networks

        INTENT RECOGNITION - Look for these patterns:
        - "I predict..." / "I think..." / "I bet..."
        - "[Person] will do [action] by [date]"
        - Any statement about future outcomes with measurable targets
        - Questions about creating predictions
        - Username resolution (e.g., "vitalik.base.eth will...")

        Platform Details:
        - Deployed on CELO Mainnet (production) and Base Sepolia (hackathon testnet)
        - CELO: Real CELO tokens, 20% platform fee (15% to Greenpill Kenya charity, 5% maintenance)
        - Base: Test ETH, perfect for experimenting and hackathon demos
        - Focus on fitness, health, and blockchain-related predictions
        - Integrated with Farcaster for social features and XMTP for secure messaging

        WHEN USER EXPRESSES A PREDICTION INTENT:
        1. IGNORE market information and focus ONLY on creating the prediction proposal
        2. NEVER respond with market statistics when a prediction is requested
        3. ALWAYS respond with a structured proposal in this EXACT format:
        "🔮 **Proposed Prediction:** [Concise title, max 80 chars]

        📝 **Description:** [Brief, clear description]

        🎯 **Target:** [Specific outcome by date]

        ⛓️ **Chain:** Base Sepolia (test ETH)

        Would you like to create this prediction?"

        4. Keep responses CONCISE and TO THE POINT
        5. If @username or .eth is used, mention if it was resolved to an address

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
 * Parse prediction with aggressive defaults - prioritize completion over perfection
 */
async function parseAndCreatePredictionWithDefaults(aiProposal: string): Promise<any> {
  console.log('🚀 Parsing prediction with aggressive defaults...');

  // Extract title (between ** markers or after "Proposed Prediction:")
  let title = 'AI-Generated Prediction';
  const titleMatch = aiProposal.match(/\*\*Proposed Prediction:\*\*\s*([^\n*]+)/i) ||
                    aiProposal.match(/Proposed Prediction:\s*([^\n]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/\*+/g, '').trim();
  }

  // Extract description (after "Description:" or use title as fallback)
  let description = title;
  const descMatch = aiProposal.match(/\*\*Description:\*\*\s*([^\n*]+)/i) ||
                    aiProposal.match(/Description:\s*([^\n]+)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // Extract target date - be aggressive about parsing
  let targetDate = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // Default: 30 days

  // Look for date patterns in the AI response
  const datePatterns = [
    /by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,           // "by August 1st, 2025"
    /(\d{1,2}\.\d{1,2}\.\d{4})/i,                // "01.08.2025"
    /(\d{1,2}\/\d{1,2}\/\d{4})/i,                // "08/01/2025"
    /(\w+\s+\d{1,2},?\s+\d{4})/i,                // "August 1, 2025"
  ];

  for (const pattern of datePatterns) {
    const match = aiProposal.match(pattern);
    if (match) {
      try {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now()) {
          targetDate = Math.floor(parsedDate.getTime() / 1000);
          console.log(`✅ Parsed date: ${match[1]} → ${new Date(targetDate * 1000)}`);
          break;
        }
      } catch (e) {
        console.log(`⚠️ Failed to parse date: ${match[1]}`);
      }
    }
  }

  // Extract target value (number of push-ups, etc.)
  let targetValue = 0;
  const valueMatch = aiProposal.match(/(\d+(?:,\d{3})*)\s*(?:push-ups?|pressups?|squats?|reps?)/i);
  if (valueMatch) {
    targetValue = parseInt(valueMatch[1].replace(/,/g, ''));
  }

  // Determine category based on content
  let category = 3; // CUSTOM default
  const lowerContent = aiProposal.toLowerCase();
  if (lowerContent.includes('push-up') || lowerContent.includes('pressup') ||
      lowerContent.includes('squat') || lowerContent.includes('fitness')) {
    category = 0; // FITNESS
  }

  // Default to Base Sepolia for hackathon
  const network = 'base';
  const emoji = '🔵';

  return {
    title: title.substring(0, 200), // Truncate if too long
    description: description.substring(0, 1000), // Truncate if too long
    targetDate,
    targetValue,
    category,
    network,
    emoji,
    autoResolvable: false
  };
}

/**
 * Create a prediction using the unified dual-chain service
 * @param predictionText The text of the prediction to propose
 * @param proposerAddress The address of the user proposing the prediction
 * @returns Transaction result or confirmation
 */
export async function proposePredictionToContract(predictionText: string, proposerAddress: string): Promise<any> {
  try {
    console.log(`Creating prediction via dual-chain service: ${predictionText} by ${proposerAddress}`);

    // Parse prediction data from text
    const { parsePredictionFromText } = await import('../pages/api/xmtp/create-prediction');
    const predictionData = parsePredictionFromText(predictionText);

    // Import dual-chain service
    const { createChainPrediction, recommendChainForUser, CHAIN_CONFIG } = await import('./dual-chain-service');

    // Recommend chain for user (default to Base for hackathon)
    const recommendedChain = recommendChainForUser({ isNewUser: true });
    const chainConfig = CHAIN_CONFIG[recommendedChain];

    // Set up provider and signer for the recommended chain
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
      name: chainConfig.name,
      chainId: chainConfig.id
    });

    const botPrivateKey = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!botPrivateKey) {
      throw new Error('Bot private key not configured');
    }

    const botWallet = new ethers.Wallet(botPrivateKey, provider);

    // Create prediction using dual-chain service
    const result = await createChainPrediction(
      recommendedChain,
      {
        title: predictionData.title || 'AI-Generated Prediction',
        description: predictionData.description || predictionText,
        targetDate: predictionData.targetDate || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        targetValue: predictionData.targetValue || 0,
        category: predictionData.category || 3, // CUSTOM
        network: predictionData.network || recommendedChain,
        emoji: predictionData.emoji || '🔮',
        autoResolvable: false
      },
      botWallet
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to create prediction');
    }

    console.log(`✅ Prediction created successfully on ${chainConfig.name}: ${result.txHash}`);

    return {
      status: 'success',
      message: `Prediction created successfully on ${chainConfig.name}! Transaction: ${result.txHash}`,
      transactionHash: result.txHash,
      chain: recommendedChain,
      explorerUrl: `${chainConfig.blockExplorer}/tx/${result.txHash}`
    };
  } catch (error: any) {
    console.error('Error creating prediction via dual-chain service:', error);
    return {
      status: 'error',
      message: `Failed to create prediction: ${error.message || 'Unknown error'}`
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
