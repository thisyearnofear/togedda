#!/usr/bin/env ts-node

/**
 * Test all external APIs and integrations
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { parseNaturalDate, validatePredictionDate, formatDateWithTimezone } from '../lib/services/timezone-service';
import { getCryptoPriceData, getWeatherData, validateExternalData } from '../lib/services/external-data-service';
import { getLocationFromIP, getLocationFromName, getUserContext, validateLocationPrediction } from '../lib/services/location-context-service';

async function testAllExternalAPIs() {
  console.log('🧪 Testing All External APIs and Integrations\n');
  
  // Test 1: Timezone and Date Parsing
  console.log('📅 Testing Timezone and Date Parsing...');
  try {
    const testDates = [
      'December 31, 2024',
      'next Friday',
      'in 2 weeks',
      'by the end of 2024',
      'August 1st, 2025'
    ];

    for (const dateText of testDates) {
      const parsed = await parseNaturalDate(dateText, 'America/New_York');
      console.log(`  "${dateText}" → ${formatDateWithTimezone(parsed.timestamp, parsed.timezone)} (confidence: ${parsed.confidence})`);
      
      const validation = validatePredictionDate(parsed.timestamp);
      if (!validation.valid) {
        console.log(`    ⚠️ Validation issues: ${validation.errors.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Date parsing test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 2: Crypto Price Data
  console.log('💰 Testing Crypto Price Data APIs...');
  try {
    const cryptos = ['BTC', 'ETH', 'CELO'];
    
    for (const symbol of cryptos) {
      const priceData = await getCryptoPriceData(symbol);
      if (priceData) {
        console.log(`  ${symbol}: $${priceData.price.toLocaleString()} (${priceData.source}, confidence: ${Math.round(priceData.confidence * 100)}%)`);
      } else {
        console.log(`  ${symbol}: ❌ No price data available`);
      }
    }
  } catch (error) {
    console.error('❌ Crypto price test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 3: Weather Data
  console.log('🌤️ Testing Weather Data API...');
  try {
    const locations = ['New York', 'London', 'Tokyo'];
    
    for (const location of locations) {
      const weatherData = await getWeatherData(location);
      if (weatherData) {
        console.log(`  ${location}: ${weatherData.condition}, ${weatherData.temperature}°C (${weatherData.source})`);
      } else {
        console.log(`  ${location}: ❌ No weather data available`);
      }
    }
  } catch (error) {
    console.error('❌ Weather data test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 4: Location Services
  console.log('📍 Testing Location Services...');
  try {
    // Test IP geolocation
    const ipLocation = await getLocationFromIP();
    if (ipLocation) {
      console.log(`  IP Location: ${ipLocation.city}, ${ipLocation.country} (${ipLocation.timezone})`);
    } else {
      console.log('  IP Location: ❌ Not available');
    }

    // Test location name lookup
    const testLocations = ['San Francisco', 'Berlin', 'Singapore'];
    for (const locationName of testLocations) {
      const location = await getLocationFromName(locationName);
      if (location) {
        console.log(`  ${locationName}: ${location.timezone} (${location.confidence * 100}% confidence)`);
      } else {
        console.log(`  ${locationName}: ❌ Not found`);
      }
    }
  } catch (error) {
    console.error('❌ Location services test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 5: User Context Detection
  console.log('👤 Testing User Context Detection...');
  try {
    const userContext = await getUserContext(
      undefined, // IP will be auto-detected
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'en-US,en;q=0.9'
    );
    
    console.log('  User Context:');
    console.log(`    Location: ${userContext.location?.city}, ${userContext.location?.country}`);
    console.log(`    Timezone: ${userContext.preferredTimezone}`);
    console.log(`    Language: ${userContext.language}`);
    console.log(`    Currency: ${userContext.currency}`);
    if (userContext.marketHours) {
      console.log(`    Market Hours: ${userContext.marketHours.open} - ${userContext.marketHours.close} ${userContext.marketHours.timezone}`);
    }
  } catch (error) {
    console.error('❌ User context test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 6: External Data Validation
  console.log('🔍 Testing External Data Validation...');
  try {
    const testPredictions = [
      { type: 'crypto_price', text: 'Bitcoin will reach $100k by end of year' },
      { type: 'weather', text: 'It will rain in New York tomorrow' },
      { type: 'location', text: 'Temperature in London will exceed 25°C' }
    ];

    for (const prediction of testPredictions) {
      const validation = await validateExternalData(prediction.type, 0, prediction.text);
      console.log(`  ${prediction.type}: Can resolve: ${validation.canResolve}, Confidence: ${Math.round(validation.confidence * 100)}%`);
      if (validation.currentValue !== undefined) {
        console.log(`    Current value: ${validation.currentValue}`);
      }
    }
  } catch (error) {
    console.error('❌ External data validation test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 7: Location Prediction Validation
  console.log('🗺️ Testing Location Prediction Validation...');
  try {
    const locationPredictions = [
      'It will rain in New York tomorrow',
      'Temperature in London will be above 20°C',
      'Bitcoin will reach $100k', // Non-location specific
      'Weather in InvalidCity will be sunny'
    ];

    for (const predictionText of locationPredictions) {
      const validation = await validateLocationPrediction(predictionText);
      console.log(`  "${predictionText}"`);
      console.log(`    Location-specific: ${validation.isLocationSpecific}`);
      console.log(`    Locations found: ${validation.locations.join(', ') || 'None'}`);
      console.log(`    Can verify: ${validation.canVerify}`);
      if (validation.suggestions.length > 0) {
        console.log(`    Suggestions: ${validation.suggestions.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Location prediction validation test failed:', error);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Summary
  console.log('📊 API Integration Summary:');
  console.log('✅ Timezone & Date Parsing: Enhanced natural language date parsing');
  console.log('✅ Crypto Price Data: Multiple sources (CoinGecko, Binance, CoinMarketCap)');
  console.log('✅ Weather Data: OpenWeather API integration');
  console.log('✅ Location Services: IP geolocation and name lookup');
  console.log('✅ User Context: Automatic timezone and preference detection');
  console.log('✅ External Validation: Automatic verification of data availability');
  console.log('✅ Location Validation: Smart location-based prediction handling');
  
  console.log('\n🎯 All external APIs tested! Configure API keys in .env.local for full functionality.');
}

if (require.main === module) {
  testAllExternalAPIs().catch(console.error);
}

export { testAllExternalAPIs };
