/**
 * Prediction Resolution Service
 * 
 * Handles automatic resolution of predictions using external data sources
 * Integrates with XMTP bot for real-time updates and contract interactions
 * Optimized for Farcaster mini app compact space requirements
 */

import { ethers } from 'ethers';
import {
  validateExternalData,
  getCryptoPriceData,
  getWeatherData,
  getUserLocationFromIP
} from './external-data-service';
import { parseNaturalDate } from './timezone-service';
import { predictionMarketABI } from '../constants';
import { getChainPrediction, getAllChainPredictions, CHAIN_CONFIG } from './dual-chain-service';

// Types for prediction resolution
export interface ResolutionResult {
  success: boolean;
  predictionId: number;
  outcome: 'YES' | 'NO' | 'UNRESOLVED';
  confidence: number;
  source: string;
  currentValue?: number;
  targetValue?: number;
  transactionHash?: string;
  error?: string;
}

export interface PendingResolution {
  predictionId: number;
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  category: number;
  autoResolvable: boolean;
  resolutionType: 'crypto_price' | 'weather' | 'fitness' | 'manual';
  criteria: string;
  lastChecked: number;
}

// Resolution monitoring state
const pendingResolutions = new Map<number, PendingResolution>();
const resolutionHistory = new Map<number, ResolutionResult>();

/**
 * Initialize prediction resolution system (on-demand only)
 * No background monitoring - resolutions are triggered manually
 */
export async function initializePredictionResolution(): Promise<void> {
  console.log('🎯 Prediction resolution system initialized (on-demand mode)');
  console.log('📝 Predictions will be resolved when manually triggered');

  // Clear any existing monitoring state
  pendingResolutions.clear();
  resolutionHistory.clear();

  console.log('✅ Ready for on-demand prediction resolution');
}

/**
 * Determine the type of resolution needed for a prediction
 */
function determineResolutionType(title: string, description: string): 'crypto_price' | 'weather' | 'fitness' | 'manual' {
  const text = `${title} ${description}`.toLowerCase();
  
  // Crypto price predictions
  if (text.match(/\b(bitcoin|btc|ethereum|eth|celo|matic|price|reach|\$)\b/)) {
    return 'crypto_price';
  }
  
  // Weather predictions
  if (text.match(/\b(rain|snow|temperature|weather|sunny|cloudy|storm)\b/)) {
    return 'weather';
  }
  
  // Fitness predictions (platform-specific)
  if (text.match(/\b(pushups|squats|exercise|workout|fitness|reps)\b/)) {
    return 'fitness';
  }
  
  return 'manual';
}

/**
 * Check if a prediction is eligible for resolution
 */
export async function checkPredictionEligibility(predictionId: number): Promise<{
  eligible: boolean;
  reason: string;
  prediction?: any;
}> {
  try {
    // Try to find prediction on both chains
    let prediction = await getChainPrediction(predictionId, 'celo');
    if (!prediction) {
      prediction = await getChainPrediction(predictionId, 'base');
    }

    if (!prediction) {
      return { eligible: false, reason: 'Prediction not found on any chain' };
    }

    if (prediction.status !== 0) {
      return { eligible: false, reason: 'Prediction is not active' };
    }

    if (!prediction.autoResolvable) {
      return { eligible: false, reason: 'Prediction is not auto-resolvable' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < prediction.targetDate) {
      return {
        eligible: false,
        reason: `Target date not reached (${new Date(prediction.targetDate * 1000).toLocaleDateString()})`
      };
    }

    return { eligible: true, reason: 'Ready for resolution', prediction };

  } catch (error) {
    return { eligible: false, reason: `Error checking eligibility: ${error}` };
  }
}

/**
 * Resolve a specific prediction using external data (on-demand)
 */
export async function resolvePrediction(predictionId: number): Promise<ResolutionResult> {
  console.log(`🎯 Attempting to resolve prediction ${predictionId}`);

  try {
    // First check if prediction is eligible
    const eligibility = await checkPredictionEligibility(predictionId);
    if (!eligibility.eligible) {
      return {
        success: false,
        predictionId,
        outcome: 'UNRESOLVED',
        confidence: 0,
        source: 'eligibility_check',
        error: eligibility.reason
      };
    }

    const prediction = eligibility.prediction;
    const resolutionType = determineResolutionType(prediction.title, prediction.description);
    const criteria = `${prediction.title} ${prediction.description}`;

    let outcome: 'YES' | 'NO' | 'UNRESOLVED' = 'UNRESOLVED';
    let confidence = 0;
    let source = 'unknown';
    let currentValue: number | undefined;

    switch (resolutionType) {
      case 'crypto_price':
        const cryptoResult = await resolveCryptoPrediction({
          predictionId,
          targetValue: prediction.targetValue,
          criteria
        });
        outcome = cryptoResult.outcome;
        confidence = cryptoResult.confidence;
        source = cryptoResult.source;
        currentValue = cryptoResult.currentValue;
        break;

      case 'weather':
        const weatherResult = await resolveWeatherPrediction({
          predictionId,
          criteria
        });
        outcome = weatherResult.outcome;
        confidence = weatherResult.confidence;
        source = weatherResult.source;
        break;

      case 'fitness':
        const fitnessResult = await resolveFitnessPrediction({
          predictionId,
          targetValue: prediction.targetValue,
          criteria
        });
        outcome = fitnessResult.outcome;
        confidence = fitnessResult.confidence;
        source = fitnessResult.source;
        currentValue = fitnessResult.currentValue;
        break;

      default:
        return {
          success: false,
          predictionId,
          outcome: 'UNRESOLVED',
          confidence: 0,
          source: 'manual',
          error: 'Manual resolution required'
        };
    }

    // Only resolve if confidence is high enough
    if (confidence >= 0.8 && outcome !== 'UNRESOLVED') {
      const txHash = await executeContractResolution(predictionId, outcome);

      // Store in resolution history
      const result: ResolutionResult = {
        success: true,
        predictionId,
        outcome,
        confidence,
        source,
        currentValue,
        targetValue: prediction.targetValue,
        transactionHash: txHash
      };

      resolutionHistory.set(predictionId, result);
      return result;
    }

    return {
      success: false,
      predictionId,
      outcome,
      confidence,
      source,
      currentValue,
      targetValue: prediction.targetValue,
      error: `Insufficient confidence: ${confidence}`
    };

  } catch (error) {
    return {
      success: false,
      predictionId,
      outcome: 'UNRESOLVED',
      confidence: 0,
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Resolve crypto price predictions
 */
async function resolveCryptoPrediction(params: {
  predictionId: number;
  targetValue: number;
  criteria: string;
}): Promise<{
  outcome: 'YES' | 'NO' | 'UNRESOLVED';
  confidence: number;
  source: string;
  currentValue?: number;
}> {
  // Extract crypto symbol from prediction text
  const symbolMatch = params.criteria.match(/\b(bitcoin|btc|ethereum|eth|celo|matic)\b/i);
  if (!symbolMatch) {
    return { outcome: 'UNRESOLVED', confidence: 0, source: 'no_symbol' };
  }

  const symbol = symbolMatch[1].toLowerCase();
  const symbolMap: Record<string, string> = {
    'bitcoin': 'BTC',
    'btc': 'BTC',
    'ethereum': 'ETH',
    'eth': 'ETH',
    'celo': 'CELO',
    'matic': 'MATIC'
  };

  const cryptoSymbol = symbolMap[symbol];
  if (!cryptoSymbol) {
    return { outcome: 'UNRESOLVED', confidence: 0, source: 'unknown_symbol' };
  }

  const priceData = await getCryptoPriceData(cryptoSymbol);
  if (!priceData) {
    return { outcome: 'UNRESOLVED', confidence: 0, source: 'no_price_data' };
  }

  const outcome = priceData.price >= params.targetValue ? 'YES' : 'NO';

  return {
    outcome,
    confidence: priceData.confidence,
    source: priceData.source,
    currentValue: priceData.price
  };
}

/**
 * Resolve weather predictions
 */
async function resolveWeatherPrediction(params: {
  predictionId: number;
  criteria: string;
}): Promise<{
  outcome: 'YES' | 'NO' | 'UNRESOLVED';
  confidence: number;
  source: string;
}> {
  // Extract location from prediction text
  const locationMatch = params.criteria.match(/(?:in|at)\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
  if (!locationMatch) {
    return { outcome: 'UNRESOLVED', confidence: 0, source: 'no_location' };
  }

  const location = locationMatch[1].trim();
  const weatherData = await getWeatherData(location);

  if (!weatherData) {
    return { outcome: 'UNRESOLVED', confidence: 0, source: 'no_weather_data' };
  }

  // Determine outcome based on weather condition and prediction criteria
  const criteria = params.criteria.toLowerCase();
  let outcome: 'YES' | 'NO' = 'NO';

  if (criteria.includes('rain') && weatherData.condition.includes('rain')) {
    outcome = 'YES';
  } else if (criteria.includes('sunny') && weatherData.condition.includes('clear')) {
    outcome = 'YES';
  } else if (criteria.includes('snow') && weatherData.condition.includes('snow')) {
    outcome = 'YES';
  }

  return {
    outcome,
    confidence: 0.85,
    source: weatherData.source
  };
}

/**
 * Resolve fitness predictions (platform-specific)
 */
async function resolveFitnessPrediction(params: {
  predictionId: number;
  targetValue: number;
  criteria: string;
}): Promise<{
  outcome: 'YES' | 'NO' | 'UNRESOLVED';
  confidence: number;
  source: string;
  currentValue?: number;
}> {
  // This would integrate with your fitness tracking system
  // For now, return unresolved as it requires platform-specific data
  return {
    outcome: 'UNRESOLVED',
    confidence: 0,
    source: 'fitness_platform_required'
  };
}

/**
 * Execute contract resolution transaction
 */
async function executeContractResolution(predictionId: number, outcome: 'YES' | 'NO'): Promise<string> {
  const botPrivateKey = process.env.BOT_PRIVATE_KEY;
  if (!botPrivateKey) {
    throw new Error('Bot private key not configured');
  }

  // Determine which chain the prediction is on
  let prediction = await getChainPrediction(predictionId, 'celo');
  let chain: 'celo' | 'base' = 'celo';

  if (!prediction) {
    prediction = await getChainPrediction(predictionId, 'base');
    chain = 'base';
  }

  if (!prediction) {
    throw new Error(`Prediction ${predictionId} not found on any chain`);
  }

  const chainConfig = CHAIN_CONFIG[chain];
  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const botWallet = new ethers.Wallet(botPrivateKey, provider);
  const contract = new ethers.Contract(chainConfig.contractAddress, predictionMarketABI, botWallet);

  // Convert outcome to contract enum (1 = YES, 2 = NO)
  const contractOutcome = outcome === 'YES' ? 1 : 2;

  const tx = await contract.resolvePrediction(predictionId, contractOutcome);
  await tx.wait();

  return tx.hash;
}

/**
 * Get resolution status for UI display
 */
export function getResolutionStatus(): {
  pending: number;
  resolved: number;
  recent: ResolutionResult[];
} {
  const recent = Array.from(resolutionHistory.values())
    .sort((a, b) => b.predictionId - a.predictionId)
    .slice(0, 10);

  return {
    pending: 0, // No background monitoring
    resolved: resolutionHistory.size,
    recent
  };
}

/**
 * Get eligible predictions for resolution
 */
export async function getEligiblePredictions(): Promise<Array<{
  predictionId: number;
  title: string;
  targetDate: number;
  autoResolvable: boolean;
  eligible: boolean;
  reason: string;
}>> {
  try {
    const chainPredictions = await getAllChainPredictions();
    const eligibleList = [];

    for (const prediction of chainPredictions) {
      if (prediction.status === 0 && prediction.autoResolvable) { // ACTIVE and auto-resolvable
        const eligibility = await checkPredictionEligibility(prediction.id);
        eligibleList.push({
          predictionId: prediction.id,
          title: prediction.title,
          targetDate: prediction.targetDate,
          autoResolvable: prediction.autoResolvable,
          eligible: eligibility.eligible,
          reason: eligibility.reason
        });
      }
    }

    return eligibleList;
  } catch (error) {
    console.error('Error getting eligible predictions:', error);
    return [];
  }
}
