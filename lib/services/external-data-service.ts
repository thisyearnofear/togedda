/**
 * External Data Service
 * Integrates with external APIs for automatic prediction resolution
 */

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
  confidence: number;
}

export interface WeatherData {
  location: string;
  condition: string;
  temperature: number;
  timestamp: number;
  source: string;
}

export interface SportsData {
  event: string;
  result: string;
  timestamp: number;
  source: string;
}

/**
 * Get cryptocurrency price from multiple sources
 */
export async function getCryptoPriceData(symbol: string): Promise<PriceData | null> {
  const sources = [
    () => getCoinGeckoPrice(symbol),
    () => getCoinMarketCapPrice(symbol),
    () => getBinancePrice(symbol)
  ];

  for (const source of sources) {
    try {
      const data = await source();
      if (data) return data;
    } catch (error) {
      console.warn(`Price source failed for ${symbol}:`, error);
    }
  }

  return null;
}

/**
 * CoinGecko API integration
 */
async function getCoinGeckoPrice(symbol: string): Promise<PriceData | null> {
  try {
    const coinId = getCoinGeckoId(symbol);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_last_updated_at=true`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Imperfect-Form/1.0'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) return null;

    return {
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      timestamp: coinData.last_updated_at,
      source: 'coingecko',
      confidence: 0.95
    };
  } catch (error) {
    console.warn('CoinGecko API failed:', error);
    return null;
  }
}

/**
 * CoinMarketCap API integration (requires API key)
 */
async function getCoinMarketCapPrice(symbol: string): Promise<PriceData | null> {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const coinData = data.data[symbol.toUpperCase()];

    if (!coinData) return null;

    return {
      symbol: symbol.toUpperCase(),
      price: coinData.quote.USD.price,
      timestamp: Math.floor(new Date(coinData.last_updated).getTime() / 1000),
      source: 'coinmarketcap',
      confidence: 0.98
    };
  } catch (error) {
    console.warn('CoinMarketCap API failed:', error);
    return null;
  }
}

/**
 * Binance API integration (public endpoint)
 */
async function getBinancePrice(symbol: string): Promise<PriceData | null> {
  try {
    const tradingPair = `${symbol.toUpperCase()}USDT`;
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${tradingPair}`,
      {
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(data.price),
      timestamp: Math.floor(Date.now() / 1000),
      source: 'binance',
      confidence: 0.90
    };
  } catch (error) {
    console.warn('Binance API failed:', error);
    return null;
  }
}

/**
 * Get weather data for location-based predictions
 */
export async function getWeatherData(location: string): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`,
      {
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      location,
      condition: data.weather[0].main.toLowerCase(),
      temperature: data.main.temp,
      timestamp: data.dt,
      source: 'openweather'
    };
  } catch (error) {
    console.warn('Weather API failed:', error);
    return null;
  }
}

/**
 * Get sports data (example with a free API)
 */
export async function getSportsData(sport: string, event: string): Promise<SportsData | null> {
  // This would integrate with sports APIs like ESPN, The Sports DB, etc.
  // For now, returning null as it requires specific API keys and endpoints
  console.log(`Sports data requested for ${sport}: ${event}`);
  return null;
}

/**
 * Helper function to map crypto symbols to CoinGecko IDs
 */
function getCoinGeckoId(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'CELO': 'celo',
    'MATIC': 'matic-network',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink'
  };

  return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
}

/**
 * Validate external data for prediction resolution
 */
export async function validateExternalData(
  predictionType: string,
  targetValue: number,
  criteria: string
): Promise<{
  canResolve: boolean;
  currentValue?: number;
  confidence: number;
  source: string;
  lastUpdated: number;
}> {
  console.log(`Validating external data for ${predictionType}:`, criteria);

  if (predictionType === 'crypto_price') {
    // Extract symbol from criteria
    const symbolMatch = criteria.match(/(\w+)\s+(?:price|will reach)/i);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      const priceData = await getCryptoPriceData(symbol);
      
      if (priceData) {
        return {
          canResolve: true,
          currentValue: priceData.price,
          confidence: priceData.confidence,
          source: priceData.source,
          lastUpdated: priceData.timestamp
        };
      }
    }
  }

  if (predictionType === 'weather') {
    // Extract location from criteria
    const locationMatch = criteria.match(/(?:in|at)\s+([^,]+)/i);
    if (locationMatch) {
      const location = locationMatch[1].trim();
      const weatherData = await getWeatherData(location);
      
      if (weatherData) {
        return {
          canResolve: true,
          confidence: 0.85,
          source: weatherData.source,
          lastUpdated: weatherData.timestamp
        };
      }
    }
  }

  return {
    canResolve: false,
    confidence: 0,
    source: 'none',
    lastUpdated: 0
  };
}

/**
 * Get real-time data for prediction monitoring
 */
export async function getRealtimeData(dataType: string, identifier: string): Promise<any> {
  switch (dataType) {
    case 'crypto_price':
      return await getCryptoPriceData(identifier);
    case 'weather':
      return await getWeatherData(identifier);
    case 'sports':
      return await getSportsData('general', identifier);
    default:
      return null;
  }
}

/**
 * Get user location from IP address (re-export from location service)
 */
export async function getUserLocationFromIP(ipAddress?: string): Promise<any> {
  // This is a simple wrapper - the actual implementation is in location-context-service
  try {
    const { getLocationFromIP } = await import('./location-context-service');
    return await getLocationFromIP(ipAddress);
  } catch (error) {
    console.warn('Failed to get user location from IP:', error);
    return null;
  }
}
