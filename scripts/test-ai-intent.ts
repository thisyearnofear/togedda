#!/usr/bin/env ts-node

/**
 * Test script to verify AI intent recognition
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { generatePredictionProposal } from '../lib/ai-bot-service';

async function testIntentRecognition() {
  console.log('🧪 Testing AI Intent Recognition\n');
  
  const testCases = [
    {
      name: "Clear prediction intent",
      message: "i predict that dwr.eth will do 100 pressups on the platform on base sepolia by 1st August 2025",
      expectedIntent: true
    },
    {
      name: "Alternative prediction format",
      message: "I think Bitcoin will reach $100k by end of year",
      expectedIntent: true
    },
    {
      name: "General question",
      message: "What prediction markets are live?",
      expectedIntent: false
    },
    {
      name: "Fitness goal",
      message: "I will complete 50 squats by next Friday",
      expectedIntent: true
    }
  ];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`💬 Message: "${testCase.message}"`);
    
    try {
      const response = await generatePredictionProposal(testCase.message, apiKey, `test_${Date.now()}`);
      
      console.log(`🤖 AI Response:`);
      console.log(response);
      
      const hasProposedPrediction = response.toLowerCase().includes('proposed prediction');
      const hasConfirmationPrompt = response.toLowerCase().includes('would you like to create');
      
      console.log(`✅ Contains "Proposed Prediction": ${hasProposedPrediction}`);
      console.log(`✅ Contains confirmation prompt: ${hasConfirmationPrompt}`);
      
      if (testCase.expectedIntent && hasProposedPrediction && hasConfirmationPrompt) {
        console.log(`🎯 PASS: Correctly identified prediction intent`);
      } else if (!testCase.expectedIntent && !hasProposedPrediction) {
        console.log(`🎯 PASS: Correctly handled non-prediction message`);
      } else {
        console.log(`❌ FAIL: Intent recognition mismatch`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${testCase.name}":`, error);
    }
    
    console.log('─'.repeat(60));
  }
}

if (require.main === module) {
  testIntentRecognition().catch(console.error);
}

export { testIntentRecognition };
