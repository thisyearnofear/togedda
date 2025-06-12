#!/usr/bin/env ts-node

/**
 * Test single prediction intent case
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { generatePredictionProposal } from '../lib/ai-bot-service';

async function testSingleIntent() {
  console.log('🧪 Testing Single Prediction Intent\n');
  
  const message = "i predict that dwr.eth will do 100 pressups on the platform on base sepolia by 1st August 2025";
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }

  console.log(`💬 Message: "${message}"`);
  
  try {
    const response = await generatePredictionProposal(message, apiKey, `test_${Date.now()}`);
    
    console.log(`\n🤖 AI Response:`);
    console.log(response);
    
    const hasProposedPrediction = response.toLowerCase().includes('proposed prediction');
    const hasConfirmationPrompt = response.toLowerCase().includes('would you like to create');
    const hasMarketInfo = response.toLowerCase().includes('active predictions') || response.toLowerCase().includes('total volume');
    
    console.log(`\n📊 Analysis:`);
    console.log(`✅ Contains "Proposed Prediction": ${hasProposedPrediction}`);
    console.log(`✅ Contains confirmation prompt: ${hasConfirmationPrompt}`);
    console.log(`❌ Contains market info (should be false): ${hasMarketInfo}`);
    
    if (hasProposedPrediction && hasConfirmationPrompt && !hasMarketInfo) {
      console.log(`\n🎯 SUCCESS: Perfect prediction proposal!`);
    } else {
      console.log(`\n❌ ISSUE: Not a proper prediction proposal`);
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

if (require.main === module) {
  testSingleIntent().catch(console.error);
}

export { testSingleIntent };
