/**
 * XMTP Prediction Helper Functions
 * Utilities for parsing and formatting prediction data from XMTP messages
 */

import { SupportedChain } from './dual-chain-service';

export interface CreatePredictionRequest {
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  category: number;
  network: string;
  emoji: string;
  userAddress: string;
  autoResolvable?: boolean;
  chain?: SupportedChain;
}

/**
 * Helper function to parse prediction details from AI-generated text
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
    // Default to Base for hackathon
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
  
  message += `**Network:** ${emoji || '🔮'} ${network || 'base'}\n\n`;
  message += `Would you like me to create this prediction? Reply "yes" to confirm or provide changes.`;
  
  return message;
}

/**
 * Validate prediction data before creation
 */
export function validatePredictionData(prediction: Partial<CreatePredictionRequest>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!prediction.title || prediction.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!prediction.description || prediction.description.trim().length === 0) {
    errors.push('Description is required');
  }
  
  if (!prediction.targetDate || prediction.targetDate <= Math.floor(Date.now() / 1000)) {
    errors.push('Target date must be in the future');
  }
  
  if (prediction.category === undefined || prediction.category < 0 || prediction.category > 3) {
    errors.push('Invalid category');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
