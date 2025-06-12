/**
 * Location and Context Service
 * Provides location-based context for predictions and user timezone detection
 */

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  confidence: number;
  source: string;
}

export interface UserContext {
  location?: LocationContext;
  preferredTimezone?: string;
  language?: string;
  currency?: string;
  marketHours?: {
    open: string;
    close: string;
    timezone: string;
  };
}

/**
 * Get user location context from IP address
 */
export async function getLocationFromIP(ipAddress?: string): Promise<LocationContext | null> {
  try {
    // Use ipapi.co for IP geolocation (free tier available)
    const url = ipAddress 
      ? `https://ipapi.co/${ipAddress}/json/`
      : 'https://ipapi.co/json/';
      
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Imperfect-Form/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.error) {
      console.warn('IP geolocation error:', data.reason);
      return null;
    }

    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      coordinates: {
        lat: data.latitude,
        lng: data.longitude
      },
      confidence: 0.8,
      source: 'ipapi'
    };
  } catch (error) {
    console.warn('IP geolocation failed:', error);
    return null;
  }
}

/**
 * Get location context from city/country name
 */
export async function getLocationFromName(locationName: string): Promise<LocationContext | null> {
  try {
    // Use OpenStreetMap Nominatim for geocoding (free)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Imperfect-Form/1.0'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const location = data[0];
    const address = location.address || {};

    // Get timezone from coordinates
    const timezone = await getTimezoneFromCoordinates(
      parseFloat(location.lat),
      parseFloat(location.lon)
    );

    return {
      country: address.country,
      region: address.state || address.region,
      city: address.city || address.town || address.village,
      timezone: timezone || 'UTC',
      coordinates: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon)
      },
      confidence: 0.9,
      source: 'nominatim'
    };
  } catch (error) {
    console.warn('Location name lookup failed:', error);
    return null;
  }
}

/**
 * Get timezone from coordinates
 */
async function getTimezoneFromCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    // Use TimeZoneDB API if available
    const apiKey = process.env.TIMEZONEDB_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey}&format=json&by=position&lat=${lat}&lng=${lng}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (response.ok) {
        const data = await response.json();
        return data.zoneName;
      }
    }

    // Fallback to a simple timezone estimation based on longitude
    const timezoneOffset = Math.round(lng / 15);
    const utcOffset = Math.max(-12, Math.min(12, timezoneOffset));
    return `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
  } catch (error) {
    console.warn('Timezone lookup failed:', error);
    return null;
  }
}

/**
 * Get comprehensive user context
 */
export async function getUserContext(
  ipAddress?: string,
  userAgent?: string,
  acceptLanguage?: string
): Promise<UserContext> {
  const context: UserContext = {};

  // Get location context
  const locationResult = await getLocationFromIP(ipAddress);
  if (locationResult) {
    context.location = locationResult;
  }

  // Extract language preference
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
    context.language = languages[0] || 'en';
  }

  // Set preferred timezone
  if (context.location?.timezone) {
    context.preferredTimezone = context.location.timezone;
  }

  // Set currency based on country
  if (context.location?.country) {
    context.currency = getCurrencyForCountry(context.location.country);
  }

  // Set market hours based on timezone
  if (context.preferredTimezone) {
    context.marketHours = getMarketHours(context.preferredTimezone);
  }

  return context;
}

/**
 * Get currency for country
 */
function getCurrencyForCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    'United States': 'USD',
    'Canada': 'CAD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Japan': 'JPY',
    'China': 'CNY',
    'India': 'INR',
    'Australia': 'AUD',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'South Korea': 'KRW',
    'Singapore': 'SGD',
    'Switzerland': 'CHF',
    'Norway': 'NOK',
    'Sweden': 'SEK',
    'Denmark': 'DKK'
  };

  return currencyMap[country] || 'USD';
}

/**
 * Get market hours for timezone
 */
function getMarketHours(timezone: string): {
  open: string;
  close: string;
  timezone: string;
} {
  // Default to NYSE hours (9:30 AM - 4:00 PM ET)
  // This could be expanded to support different markets
  return {
    open: '09:30',
    close: '16:00',
    timezone: 'America/New_York'
  };
}

/**
 * Validate if a prediction is location-specific and can be verified
 */
export async function validateLocationPrediction(
  predictionText: string
): Promise<{
  isLocationSpecific: boolean;
  locations: string[];
  canVerify: boolean;
  suggestions: string[];
}> {
  const lowerText = predictionText.toLowerCase();
  const suggestions: string[] = [];
  
  // Look for location indicators
  const locationKeywords = ['in ', 'at ', 'weather', 'temperature', 'rain', 'snow', 'sunny'];
  const isLocationSpecific = locationKeywords.some(keyword => lowerText.includes(keyword));
  
  // Extract potential locations
  const locations: string[] = [];
  const locationPattern = /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  let match;
  while ((match = locationPattern.exec(predictionText)) !== null) {
    locations.push(match[1]);
  }

  let canVerify = false;
  
  if (isLocationSpecific && locations.length > 0) {
    // Check if we can get location data
    for (const location of locations) {
      const locationContext = await getLocationFromName(location);
      if (locationContext) {
        canVerify = true;
        break;
      }
    }
    
    if (!canVerify) {
      suggestions.push('Please specify a more recognizable location (e.g., "New York", "London", "Tokyo")');
    }
  } else if (isLocationSpecific && locations.length === 0) {
    suggestions.push('Please specify the location for this prediction');
  }

  return {
    isLocationSpecific,
    locations,
    canVerify,
    suggestions
  };
}
