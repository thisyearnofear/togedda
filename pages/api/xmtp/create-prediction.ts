/**
 * API endpoint for creating predictions through the XMTP bot
 * Handles the full flow from AI proposal to on-chain creation
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { createChainPrediction, SupportedChain, CHAIN_CONFIG } from '@/lib/dual-chain-service';

interface CreatePredictionRequest {
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  category: number;
  network: string;
  emoji: string;
  userAddress: string;
  autoResolvable?: boolean;
  chain?: SupportedChain; // Add chain selection
}

interface CreatePredictionResponse {
  success: boolean;
  predictionId?: number;
  transactionHash?: string;
  message: string;
  error?: string;
  chain?: string;
  explorerUrl?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePredictionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const {
      title,
      description,
      targetDate,
      targetValue,
      category,
      network,
      emoji,
      userAddress,
      autoResolvable = false,
      chain = 'base' // Default to Base Sepolia for hackathon
    }: CreatePredictionRequest = req.body;

    // Validate required fields
    if (!title || !description || !targetDate || !userAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, targetDate, userAddress'
      });
    }

    // Validate target date is in the future
    if (targetDate <= Math.floor(Date.now() / 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Target date must be in the future'
      });
    }

    // Determine which chain to use based on network preference
    const targetChain: SupportedChain = chain || (network?.toLowerCase().includes('celo') ? 'celo' : 'base');
    const chainConfig = CHAIN_CONFIG[targetChain];

    console.log(`🔄 Creating prediction on ${chainConfig.name}: ${title}`);

    // Set up provider and signer for the target chain
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
      name: chainConfig.name,
      chainId: chainConfig.id
    });

    // For bot-created predictions, we need a bot wallet with native currency
    const botPrivateKey = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!botPrivateKey) {
      return res.status(500).json({
        success: false,
        message: 'Bot wallet not configured'
      });
    }

    const botWallet = new ethers.Wallet(botPrivateKey, provider);

    // Use the unified dual-chain service to create the prediction
    const result = await createChainPrediction(
      targetChain,
      {
        title,
        description,
        targetDate,
        targetValue: targetValue || 0,
        category: category || 3, // Default to CUSTOM category
        network: network || targetChain,
        emoji: emoji || '🔮',
        autoResolvable
      },
      botWallet
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to create prediction',
        error: result.error
      });
    }

    console.log(`✅ Prediction created successfully on ${chainConfig.name}: ${result.txHash}`);

    return res.status(200).json({
      success: true,
      transactionHash: result.txHash,
      message: `Prediction "${title}" created successfully on ${chainConfig.name}! Transaction: ${result.txHash}`,
      chain: targetChain,
      explorerUrl: `${chainConfig.blockExplorer}/tx/${result.txHash}`
    });

  } catch (error: any) {
    console.error('Error creating prediction:', error);
    
    let errorMessage = 'Failed to create prediction';

    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient balance to create prediction. Please ensure you have enough tokens for gas fees.';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error - please try again';
    } else if (error.message?.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
}

/**
 * Helper function to parse prediction details from AI-generated text
 * This can be used by the bot to extract structured data from user messages
 */
export function parsePredictionFromText(text: string): Partial<CreatePredictionRequest> {
  const prediction: Partial<CreatePredictionRequest> = {};
  
  // Extract title (look for "Proposed Prediction:" or similar patterns)
  const titleMatch = text.match(/(?:Proposed Prediction:|Prediction:|Title:)\s*([^\n.]+)/i);
  if (titleMatch) {
    prediction.title = titleMatch[1].trim();
  }
  
  // Extract description (look for "Description:" or content after title)
  const descMatch = text.match(/(?:Description:|Details:)\s*([^\n]+)/i);
  if (descMatch) {
    prediction.description = descMatch[1].trim();
  } else if (prediction.title) {
    // Use the full text as description if no specific description found
    prediction.description = text.replace(/(?:Proposed Prediction:|Prediction:|Title:)\s*[^\n.]+/i, '').trim();
  }
  
  // Extract target date (look for dates)
  const dateMatch = text.match(/(?:by|before|until)\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
  if (dateMatch) {
    try {
      const targetDate = new Date(dateMatch[1]);
      prediction.targetDate = Math.floor(targetDate.getTime() / 1000);
    } catch (e) {
      console.log('Could not parse target date');
    }
  }
  
  // Extract target value (look for numbers)
  const valueMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:dollars?|\$|CELO|tokens?)/i);
  if (valueMatch) {
    prediction.targetValue = parseFloat(valueMatch[1].replace(/,/g, ''));
  }
  
  // Determine category based on keywords
  const lowerText = text.toLowerCase();
  if (lowerText.includes('fitness') || lowerText.includes('exercise') || lowerText.includes('pushup') || lowerText.includes('squat')) {
    prediction.category = 0; // FITNESS
  } else if (lowerText.includes('blockchain') || lowerText.includes('crypto') || lowerText.includes('bitcoin') || lowerText.includes('ethereum')) {
    prediction.category = 1; // CHAIN
  } else if (lowerText.includes('community') || lowerText.includes('social')) {
    prediction.category = 2; // COMMUNITY
  } else {
    prediction.category = 3; // CUSTOM
  }
  
  // Determine network and chain (updated for unified contracts)
  if (lowerText.includes('base') || lowerText.includes('sepolia')) {
    prediction.network = 'base';
    prediction.emoji = '🔵';
    (prediction as any).chain = 'base';
  } else if (lowerText.includes('celo') || lowerText.includes('mainnet')) {
    prediction.network = 'celo';
    prediction.emoji = '🟡';
    (prediction as any).chain = 'celo';
  } else {
    // Default to Base Sepolia for hackathon
    prediction.network = 'base';
    prediction.emoji = '🔵';
    (prediction as any).chain = 'base';
  }
  
  return prediction;
}

/**
 * Helper function to format prediction confirmation message
 */
export function formatPredictionConfirmation(prediction: Partial<CreatePredictionRequest>): string {
  const { title, description, targetDate, targetValue, network, emoji } = prediction;
  
  let message = `🔮 **Prediction Proposal**\n\n`;
  message += `**Title:** ${title || 'Untitled Prediction'}\n`;
  message += `**Description:** ${description || 'No description provided'}\n`;
  
  if (targetDate) {
    const date = new Date(targetDate * 1000);
    message += `**Target Date:** ${date.toLocaleDateString()}\n`;
  }
  
  if (targetValue) {
    message += `**Target Value:** ${targetValue.toLocaleString()}\n`;
  }
  
  message += `**Network:** ${emoji || '🔮'} ${network || 'celo'}\n\n`;
  message += `Would you like me to create this prediction? Reply "yes" to confirm or provide changes.`;
  
  return message;
}
