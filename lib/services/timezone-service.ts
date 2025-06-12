/**
 * Timezone and Date Handling Service
 * Provides robust date parsing and timezone management for predictions
 */

import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';

export interface ParsedDate {
  timestamp: number; // Unix timestamp in seconds
  timezone: string;
  originalText: string;
  confidence: 'high' | 'medium' | 'low';
  ambiguous: boolean;
  suggestions?: string[];
}

/**
 * Enhanced date parsing with timezone awareness
 */
export async function parseNaturalDate(
  dateText: string, 
  userTimezone?: string,
  userLocation?: string
): Promise<ParsedDate> {
  console.log('🕐 Parsing natural date:', dateText);
  
  // Default to UTC if no timezone provided
  const timezone = userTimezone || await detectUserTimezone(userLocation) || 'UTC';
  
  // Common date patterns
  const patterns = [
    // Specific dates
    { regex: /(\w+\s+\d{1,2},?\s+\d{4})/i, confidence: 'high' as const },
    { regex: /(\d{1,2}\/\d{1,2}\/\d{4})/i, confidence: 'high' as const },
    { regex: /(\d{4}-\d{2}-\d{2})/i, confidence: 'high' as const },
    
    // Relative dates
    { regex: /(next\s+\w+)/i, confidence: 'medium' as const },
    { regex: /(in\s+\d+\s+\w+)/i, confidence: 'medium' as const },
    { regex: /(by\s+the\s+end\s+of\s+\w+)/i, confidence: 'medium' as const },
    
    // Vague dates
    { regex: /(soon|later|eventually)/i, confidence: 'low' as const },
  ];

  let parsedDate: Date | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let ambiguous = false;
  let suggestions: string[] = [];

  // Try to parse with different patterns
  for (const pattern of patterns) {
    const match = dateText.match(pattern.regex);
    if (match) {
      try {
        parsedDate = parseRelativeDate(match[1], timezone);
        confidence = pattern.confidence;
        break;
      } catch (error) {
        console.warn('Failed to parse date pattern:', match[1]);
      }
    }
  }

  // Fallback to basic parsing
  if (!parsedDate) {
    try {
      parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      // Default to 30 days from now
      parsedDate = addDays(new Date(), 30);
      confidence = 'low';
      ambiguous = true;
      suggestions = [
        'Please specify a clearer date (e.g., "December 31, 2024")',
        'Use relative dates (e.g., "in 2 weeks", "next Friday")',
        'Include the year for clarity'
      ];
    }
  }

  // Convert to UTC timestamp (simplified for now)
  const timestamp = Math.floor(parsedDate.getTime() / 1000);

  return {
    timestamp,
    timezone,
    originalText: dateText,
    confidence,
    ambiguous,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Parse relative dates like "next Friday", "in 2 weeks"
 */
function parseRelativeDate(dateText: string, timezone: string): Date {
  const now = new Date();
  const lowerText = dateText.toLowerCase();

  // Handle "next [day]"
  if (lowerText.includes('next')) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = days.find(day => lowerText.includes(day));
    if (dayMatch) {
      const targetDay = days.indexOf(dayMatch);
      const currentDay = now.getDay();
      const daysUntil = (targetDay + 7 - currentDay) % 7 || 7;
      return addDays(now, daysUntil);
    }
  }

  // Handle "in X days/weeks/months"
  const inMatch = lowerText.match(/in\s+(\d+)\s+(\w+)/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    
    if (unit.includes('day')) return addDays(now, amount);
    if (unit.includes('week')) return addDays(now, amount * 7);
    if (unit.includes('month')) return addDays(now, amount * 30);
    if (unit.includes('year')) return addDays(now, amount * 365);
  }

  // Handle "end of [month/year]"
  if (lowerText.includes('end of')) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                   'july', 'august', 'september', 'october', 'november', 'december'];
    const monthMatch = months.find(month => lowerText.includes(month));
    if (monthMatch) {
      const monthIndex = months.indexOf(monthMatch);
      const year = lowerText.includes('2024') ? 2024 : 
                   lowerText.includes('2025') ? 2025 : 
                   now.getFullYear();
      return new Date(year, monthIndex + 1, 0); // Last day of month
    }
    
    if (lowerText.includes('year')) {
      const year = now.getFullYear();
      return new Date(year, 11, 31); // December 31st
    }
  }

  // Fallback to direct parsing
  return new Date(dateText);
}

/**
 * Detect user timezone from location or browser
 */
async function detectUserTimezone(userLocation?: string): Promise<string | null> {
  if (userLocation) {
    // Use timezone API to get timezone from location
    try {
      const response = await fetch(
        `https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONEDB_API_KEY}&format=json&by=zone&zone=${encodeURIComponent(userLocation)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.zoneName;
      }
    } catch (error) {
      console.warn('Failed to detect timezone from location:', error);
    }
  }

  // Fallback to browser timezone (if available)
  if (typeof window !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return null;
}

/**
 * Format date for display with timezone
 */
export function formatDateWithTimezone(
  timestamp: number,
  timezone: string = 'UTC',
  includeTime: boolean = true
): string {
  const date = new Date(timestamp * 1000);

  // Simplified formatting for now
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.timeZoneName = 'short';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Validate that a prediction date is reasonable
 */
export function validatePredictionDate(timestamp: number): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = Date.now() / 1000;
  const date = new Date(timestamp * 1000);
  
  // Must be in the future
  if (timestamp <= now) {
    errors.push('Prediction date must be in the future');
  }
  
  // Must be at least 1 hour in the future
  if (timestamp < now + 3600) {
    errors.push('Prediction date must be at least 1 hour in the future');
  }
  
  // Warn if more than 2 years in the future
  if (timestamp > now + (2 * 365 * 24 * 60 * 60)) {
    warnings.push('Prediction date is more than 2 years in the future');
  }
  
  // Warn if date is on a weekend (for business-related predictions)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    warnings.push('Prediction date falls on a weekend');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
