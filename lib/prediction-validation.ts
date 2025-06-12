/**
 * Enhanced Prediction Validation System
 * Ensures predictions meet contract requirements, quality standards, and platform verifiability
 */

import { resolveAddress, type ResolvedProfile } from './services/address-resolution';
import { parseNaturalDate, validatePredictionDate, formatDateWithTimezone } from './services/timezone-service';
import { validateExternalData } from './services/external-data-service';

export interface PredictionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedCost?: {
    gasEstimate: string;
    currency: string;
    chainName: string;
  };
}

export interface ValidatedPredictionData {
  title: string;
  description: string;
  targetDate: number;
  targetValue: number;
  category: 0 | 1 | 2 | 3;
  network: 'celo' | 'polygon' | 'base' | 'monad';
  emoji: string;
  autoResolvable: boolean;
  // Enhanced fields for platform verification
  targetAddress?: string; // Resolved from ENS if provided
  targetUser?: string; // Original ENS name or username
  verificationMethod?: 'platform_data' | 'manual' | 'external_api';
  platformSpecific?: {
    requiresAddress: boolean;
    dataSource: 'fitness_tracking' | 'blockchain_data' | 'external';
    resolutionCriteria: string;
  };
}

// Contract requirements based on ABI
export const PREDICTION_REQUIREMENTS = {
  title: {
    minLength: 10,
    maxLength: 200,
    required: true
  },
  description: {
    minLength: 20,
    maxLength: 1000,
    required: true
  },
  targetDate: {
    minFutureDays: 1,
    maxFutureDays: 365,
    required: true
  },
  targetValue: {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    required: false // Can be 0 for non-numeric predictions
  },
  category: {
    values: [0, 1, 2, 3], // FITNESS, CHAIN, COMMUNITY, CUSTOM
    required: true
  },
  network: {
    allowedValues: ['celo', 'polygon', 'base', 'monad'],
    required: true
  },
  emoji: {
    required: true,
    default: '🔮'
  }
} as const;

// Category mappings
export const PREDICTION_CATEGORIES = {
  FITNESS: 0,
  CHAIN: 1,
  COMMUNITY: 2,
  CUSTOM: 3
} as const;

/**
 * Platform-specific validation patterns
 */
export const PLATFORM_PATTERNS = {
  FITNESS_PREDICTION: {
    keywords: ['pushup', 'push-up', 'squat', 'exercise', 'workout', 'fitness'],
    requiresAddress: true,
    dataSource: 'fitness_tracking' as const,
    verificationMethod: 'platform_data' as const
  },
  USER_ACTIVITY: {
    keywords: ['will do', 'will complete', 'will achieve', 'on the platform'],
    requiresAddress: true,
    dataSource: 'fitness_tracking' as const,
    verificationMethod: 'platform_data' as const
  },
  BLOCKCHAIN_PREDICTION: {
    keywords: ['price', 'token', 'crypto', 'bitcoin', 'ethereum'],
    requiresAddress: false,
    dataSource: 'external' as const,
    verificationMethod: 'external_api' as const
  }
} as const;

/**
 * Validate prediction data against contract requirements
 */
export function validatePrediction(data: Partial<ValidatedPredictionData>): PredictionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (!data.title) {
    errors.push('Title is required');
  } else {
    if (data.title.length < PREDICTION_REQUIREMENTS.title.minLength) {
      errors.push(`Title must be at least ${PREDICTION_REQUIREMENTS.title.minLength} characters`);
    }
    if (data.title.length > PREDICTION_REQUIREMENTS.title.maxLength) {
      errors.push(`Title must be less than ${PREDICTION_REQUIREMENTS.title.maxLength} characters`);
    }
  }

  // Description validation
  if (!data.description) {
    errors.push('Description is required');
  } else {
    if (data.description.length < PREDICTION_REQUIREMENTS.description.minLength) {
      errors.push(`Description must be at least ${PREDICTION_REQUIREMENTS.description.minLength} characters`);
    }
    if (data.description.length > PREDICTION_REQUIREMENTS.description.maxLength) {
      errors.push(`Description must be less than ${PREDICTION_REQUIREMENTS.description.maxLength} characters`);
    }
  }

  // Target date validation
  if (!data.targetDate) {
    errors.push('Target date is required');
  } else {
    const now = Math.floor(Date.now() / 1000);
    const minDate = now + (PREDICTION_REQUIREMENTS.targetDate.minFutureDays * 24 * 60 * 60);
    const maxDate = now + (PREDICTION_REQUIREMENTS.targetDate.maxFutureDays * 24 * 60 * 60);

    if (data.targetDate <= now) {
      errors.push('Target date must be in the future');
    } else if (data.targetDate < minDate) {
      errors.push(`Target date must be at least ${PREDICTION_REQUIREMENTS.targetDate.minFutureDays} day(s) in the future`);
    } else if (data.targetDate > maxDate) {
      errors.push(`Target date cannot be more than ${PREDICTION_REQUIREMENTS.targetDate.maxFutureDays} days in the future`);
    }

    // Warning for very short timeframes
    const daysDiff = (data.targetDate - now) / (24 * 60 * 60);
    if (daysDiff < 7) {
      warnings.push('Short timeframe predictions may have limited participation');
    }
  }

  // Category validation
  if (data.category === undefined) {
    errors.push('Category is required');
  } else if (!(PREDICTION_REQUIREMENTS.category.values as readonly number[]).includes(data.category)) {
    errors.push('Invalid category');
  }

  // Network validation
  if (!data.network) {
    errors.push('Network is required');
  } else if (!PREDICTION_REQUIREMENTS.network.allowedValues.includes(data.network)) {
    errors.push(`Network must be one of: ${PREDICTION_REQUIREMENTS.network.allowedValues.join(', ')}`);
  }

  // Target value validation (optional but should be reasonable if provided)
  if (data.targetValue !== undefined && data.targetValue < 0) {
    errors.push('Target value cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize and complete prediction data with defaults
 */
export function sanitizePredictionData(data: Partial<ValidatedPredictionData>): ValidatedPredictionData {
  return {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    targetDate: data.targetDate || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days default
    targetValue: data.targetValue || 0,
    category: data.category !== undefined ? data.category : PREDICTION_CATEGORIES.CUSTOM,
    network: data.network || 'base', // Default to Base for hackathon
    emoji: data.emoji || '🔮',
    autoResolvable: data.autoResolvable || false
  };
}

/**
 * Enhanced parsing with validation
 */
export async function parseAndValidatePredictionFromText(text: string): Promise<{
  data: ValidatedPredictionData;
  validation: PredictionValidationResult;
}> {
  // Basic parsing (enhanced version of existing parser)
  const prediction: Partial<ValidatedPredictionData> = {};
  
  // Extract title
  const titleMatch = text.match(/(?:Proposed Prediction:|Prediction:|Title:)\s*([^\n.]+)/i);
  if (titleMatch) {
    prediction.title = titleMatch[1].trim();
  }
  
  // Extract description
  const descMatch = text.match(/(?:Description:|Details:)\s*([^\n]+)/i);
  if (descMatch) {
    prediction.description = descMatch[1].trim();
  } else if (prediction.title) {
    // Use the full text as description if no specific description found
    prediction.description = text.replace(/(?:Proposed Prediction:|Prediction:|Title:)\s*[^\n.]+/i, '').trim();
  }
  
  // Extract target date with enhanced parsing
  const dateMatch = text.match(/(?:by|before|until|on)\s+([^.!?]+)/i);
  if (dateMatch) {
    try {
      // Use enhanced date parsing
      const dateText = dateMatch[1].trim();
      const parsedDate = await parseNaturalDate(dateText);
      prediction.targetDate = parsedDate.timestamp;

      // Add warnings for ambiguous dates
      if (parsedDate.ambiguous && parsedDate.suggestions) {
        console.warn('Ambiguous date detected:', parsedDate.suggestions);
      }
    } catch (e) {
      console.log('Could not parse target date:', e);
      // Fallback to basic parsing
      try {
        const targetDate = new Date(dateMatch[1]);
        prediction.targetDate = Math.floor(targetDate.getTime() / 1000);
      } catch (fallbackError) {
        console.log('Fallback date parsing also failed');
      }
    }
  }
  
  // Extract target value
  const valueMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:dollars?|\$|CELO|ETH|tokens?)/i);
  if (valueMatch) {
    prediction.targetValue = parseFloat(valueMatch[1].replace(/,/g, ''));
  }
  
  // Determine category based on keywords
  const lowerText = text.toLowerCase();
  if (lowerText.includes('fitness') || lowerText.includes('exercise') || lowerText.includes('pushup') || lowerText.includes('squat')) {
    prediction.category = PREDICTION_CATEGORIES.FITNESS;
  } else if (lowerText.includes('blockchain') || lowerText.includes('crypto') || lowerText.includes('bitcoin') || lowerText.includes('ethereum')) {
    prediction.category = PREDICTION_CATEGORIES.CHAIN;
  } else if (lowerText.includes('community') || lowerText.includes('social')) {
    prediction.category = PREDICTION_CATEGORIES.COMMUNITY;
  } else {
    prediction.category = PREDICTION_CATEGORIES.CUSTOM;
  }
  
  // Determine network and emoji
  if (lowerText.includes('polygon')) {
    prediction.network = 'polygon';
    prediction.emoji = '🟣';
  } else if (lowerText.includes('base')) {
    prediction.network = 'base';
    prediction.emoji = '🔵';
  } else if (lowerText.includes('monad')) {
    prediction.network = 'monad';
    prediction.emoji = '⚫';
  } else if (lowerText.includes('celo')) {
    prediction.network = 'celo';
    prediction.emoji = '🟡';
  } else {
    // Default to Base for hackathon
    prediction.network = 'base';
    prediction.emoji = '🔵';
  }
  
  // Sanitize and validate
  const sanitizedData = sanitizePredictionData(prediction);
  const validation = validatePrediction(sanitizedData);
  
  return {
    data: sanitizedData,
    validation
  };
}

/**
 * Resolve ENS names and validate platform-specific predictions
 */
export async function enhancedValidatePrediction(text: string): Promise<{
  data: ValidatedPredictionData;
  validation: PredictionValidationResult;
  resolvedProfile?: ResolvedProfile;
}> {
  console.log('🔍 Enhanced validation for prediction:', text);

  // First, do basic parsing
  const { data: basicData, validation: basicValidation } = await parseAndValidatePredictionFromText(text);

  // If no title was extracted, use the full text as title (for raw predictions)
  if (!basicData.title && text.length > 10) {
    // Create a concise title from the prediction text
    let title = text.replace(/^(I predict that|I think that|I bet that)/i, '').trim();
    title = title.substring(0, Math.min(80, title.length)).trim(); // 80 char limit for UI
    if (title.length < 10) {
      title = text.substring(0, Math.min(80, text.length)).trim();
    }
    basicData.title = title;
  }

  // Initialize enhanced data and validation early
  let enhancedData = { ...basicData };
  let enhancedValidation = { ...basicValidation };

  // Validate title length for UI compatibility
  if (basicData.title && basicData.title.length > 80) {
    // Auto-shorten long titles
    const shortened = basicData.title.substring(0, 77) + '...';
    enhancedValidation.warnings.push(`Title shortened for UI: "${shortened}"`);
    basicData.title = shortened;
  }

  // If no description was extracted, use the full text as description
  if (!basicData.description && text.length > 20) {
    basicData.description = text.trim();
  }

  // Extract potential ENS names or usernames
  const ensPattern = /(?:^|\s)([a-zA-Z0-9-]+\.eth)(?:\s|$)/i;
  const usernamePattern = /(?:^|\s)@([a-zA-Z0-9_-]{2,})(?:\s|$)/; // Only match @username format with 2+ chars

  const ensMatch = text.match(ensPattern);
  const usernameMatch = text.match(usernamePattern);

  let resolvedProfile: ResolvedProfile | undefined;

  // Try to resolve ENS name or username
  if (ensMatch) {
    const ensName = ensMatch[1];
    console.log('🔗 Attempting to resolve ENS name:', ensName);

    try {
      resolvedProfile = await resolveAddress(ensName);
      if (resolvedProfile.address && resolvedProfile.address !== ensName.toLowerCase()) {
        enhancedData.targetAddress = resolvedProfile.address;
        enhancedData.targetUser = ensName;
        console.log('✅ ENS resolved:', ensName, '→', resolvedProfile.address);
      } else {
        enhancedValidation.warnings.push(`Could not resolve ENS name "${ensName}" to an address`);
      }
    } catch (error) {
      console.error('❌ ENS resolution failed:', error);
      enhancedValidation.warnings.push(`Failed to resolve ENS name "${ensName}"`);
    }
  } else if (usernameMatch && !ensMatch) {
    const username = usernameMatch[1]; // Already extracted without @
    console.log('👤 Attempting to resolve username:', username);

    try {
      // Try to resolve as Farcaster username
      resolvedProfile = await resolveAddress(username);
      if (resolvedProfile.farcaster?.username) {
        enhancedData.targetAddress = resolvedProfile.address;
        enhancedData.targetUser = username;
        console.log('✅ Username resolved:', username, '→', resolvedProfile.address);
      } else {
        enhancedValidation.warnings.push(`Could not resolve username "${username}" to an address`);
      }
    } catch (error) {
      console.error('❌ Username resolution failed:', error);
      enhancedValidation.warnings.push(`Failed to resolve username "${username}"`);
    }
  }

  // Determine platform-specific requirements
  const lowerText = text.toLowerCase();
  let platformSpecific: ValidatedPredictionData['platformSpecific'];

  // Check for fitness predictions
  if (PLATFORM_PATTERNS.FITNESS_PREDICTION.keywords.some(keyword => lowerText.includes(keyword))) {
    platformSpecific = {
      requiresAddress: true,
      dataSource: 'fitness_tracking',
      resolutionCriteria: 'User must have fitness data recorded on the platform'
    };
    enhancedData.autoResolvable = true;
    enhancedData.verificationMethod = 'platform_data';
  }
  // Check for user activity predictions
  else if (PLATFORM_PATTERNS.USER_ACTIVITY.keywords.some(keyword => lowerText.includes(keyword))) {
    platformSpecific = {
      requiresAddress: true,
      dataSource: 'fitness_tracking',
      resolutionCriteria: 'User activity must be verifiable on the platform'
    };
    enhancedData.autoResolvable = true;
    enhancedData.verificationMethod = 'platform_data';
  }
  // Check for blockchain predictions
  else if (PLATFORM_PATTERNS.BLOCKCHAIN_PREDICTION.keywords.some(keyword => lowerText.includes(keyword))) {
    platformSpecific = {
      requiresAddress: false,
      dataSource: 'external',
      resolutionCriteria: 'Price data from external APIs (CoinGecko, etc.)'
    };
    enhancedData.autoResolvable = true;
    enhancedData.verificationMethod = 'external_api';

    // Validate that we can actually get the external data
    try {
      const validation = await validateExternalData('crypto_price', enhancedData.targetValue || 0, text);
      if (!validation.canResolve) {
        enhancedValidation.warnings.push('⚠️ External data source may not be available for this prediction');
        enhancedData.autoResolvable = false;
      } else {
        enhancedValidation.warnings.push(`✅ External data available from ${validation.source} (confidence: ${Math.round(validation.confidence * 100)}%)`);
      }
    } catch (error) {
      console.warn('External data validation failed:', error);
      enhancedValidation.warnings.push('⚠️ Could not verify external data availability');
    }
  }
  // Default to manual resolution
  else {
    platformSpecific = {
      requiresAddress: false,
      dataSource: 'external',
      resolutionCriteria: 'Manual resolution required'
    };
    enhancedData.autoResolvable = false;
    enhancedData.verificationMethod = 'manual';
  }

  enhancedData.platformSpecific = platformSpecific;

  // Re-validate with the enhanced data (including title/description fixes)
  enhancedValidation = validatePrediction(enhancedData);

  // Handle address requirements more flexibly
  if (platformSpecific.requiresAddress && !enhancedData.targetAddress) {
    // If @ or .eth was used but couldn't be resolved, that's an error
    if (usernameMatch || ensMatch) {
      enhancedValidation.errors.push(
        `Couldn't resolve "${usernameMatch?.[1] || ensMatch?.[1]}" to an address. Provide a valid ENS name or Farcaster username, or remove it for a general prediction.`
      );
      enhancedValidation.isValid = false;
    } else {
      // No @ or .eth used - convert to general prediction
      enhancedData.platformSpecific = {
        requiresAddress: false,
        dataSource: 'external',
        resolutionCriteria: 'General prediction - manual resolution required'
      };
      enhancedData.autoResolvable = false;
      enhancedData.verificationMethod = 'manual';
      enhancedValidation.warnings.push('Converted to general prediction (no specific user target)');
    }
  }

  // Add helpful suggestions
  if (enhancedData.autoResolvable) {
    enhancedValidation.warnings.push(
      `✅ This prediction can be automatically resolved using ${platformSpecific.dataSource === 'fitness_tracking' ? 'platform fitness data' : 'external APIs'}`
    );
  } else {
    enhancedValidation.warnings.push(
      '⚠️ This prediction will require manual resolution'
    );
  }

  return {
    data: enhancedData,
    validation: enhancedValidation,
    resolvedProfile
  };
}

/**
 * Get user-friendly validation message
 */
export function getValidationMessage(validation: PredictionValidationResult): string {
  if (validation.isValid) {
    let message = "✅ Prediction looks good!";
    if (validation.warnings.length > 0) {
      message += `\n\n⚠️ Notes:\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
    }
    return message;
  } else {
    // Check if this is a date-related error and provide enhanced guidance
    const hasDateError = validation.errors.some(e =>
      e.includes('date') || e.includes('future') || e.includes('past')
    );

    if (hasDateError) {
      let message = "📅 **Date Format Issue**\n\n";
      message += validation.errors.map(e => `• ${e}`).join('\n');
      message += "\n\n**Examples of clear date formats:**\n";
      message += "• \"December 31, 2025 23:59\"\n";
      message += "• \"31.12.2025 00:00\"\n";
      message += "• \"in 6 months\"\n";
      message += "• \"next Friday\"\n";
      message += "\n💡 **Tip:** For 2-digit years, I assume future dates (e.g., \"25\" → \"2025\")";

      if (validation.warnings.length > 0) {
        message += `\n\n⚠️ Also note:\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
      }

      return message;
    } else {
      // Standard error message for non-date issues
      let message = "❌ Please fix these issues:\n";
      message += validation.errors.map(e => `• ${e}`).join('\n');

      if (validation.warnings.length > 0) {
        message += `\n\n⚠️ Also note:\n${validation.warnings.map(w => `• ${w}`).join('\n')}`;
      }

      return message;
    }
  }
}
