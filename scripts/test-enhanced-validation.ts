#!/usr/bin/env ts-node

/**
 * Test enhanced prediction validation with ENS resolution
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { enhancedValidatePrediction } from '../lib/prediction-validation';

async function testEnhancedValidation() {
  console.log('🧪 Testing Enhanced Prediction Validation\n');
  
  const testCases = [
    {
      name: "ENS-based fitness prediction (auto-resolvable)",
      text: "I predict that dwr.eth will do 100 push-ups on the platform by August 1st, 2025",
      expectedAutoResolvable: true,
      expectedRequiresAddress: true
    },
    {
      name: "Username-based fitness prediction",
      text: "I predict that @papa will complete 50 squats by next Friday",
      expectedAutoResolvable: true,
      expectedRequiresAddress: true
    },
    {
      name: "Blockchain price prediction (external API)",
      text: "I think Bitcoin will reach $100k by end of year",
      expectedAutoResolvable: true,
      expectedRequiresAddress: false
    },
    {
      name: "Generic prediction (manual resolution)",
      text: "I predict it will rain tomorrow",
      expectedAutoResolvable: false,
      expectedRequiresAddress: false
    },
    {
      name: "Fitness prediction without user (should fail)",
      text: "Someone will do 100 push-ups by next week",
      expectedAutoResolvable: true,
      expectedRequiresAddress: true,
      shouldFail: true
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`💬 Text: "${testCase.text}"`);
    
    try {
      const result = await enhancedValidatePrediction(testCase.text);
      
      console.log(`🤖 Validation Result:`);
      console.log(`  ✅ Valid: ${result.validation.isValid}`);
      console.log(`  🔄 Auto-resolvable: ${result.data.autoResolvable}`);
      console.log(`  📍 Target Address: ${result.data.targetAddress || 'None'}`);
      console.log(`  👤 Target User: ${result.data.targetUser || 'None'}`);
      console.log(`  🔧 Verification Method: ${result.data.verificationMethod || 'None'}`);
      
      if (result.resolvedProfile) {
        console.log(`  🔗 Resolved Profile: ${result.resolvedProfile.displayName || result.resolvedProfile.address}`);
      }
      
      if (result.validation.errors.length > 0) {
        console.log(`  ❌ Errors: ${result.validation.errors.join(', ')}`);
      }
      
      if (result.validation.warnings.length > 0) {
        console.log(`  ⚠️ Warnings: ${result.validation.warnings.join(', ')}`);
      }
      
      // Validate expectations
      const autoResolvableMatch = result.data.autoResolvable === testCase.expectedAutoResolvable;
      const requiresAddressMatch = result.data.platformSpecific?.requiresAddress === testCase.expectedRequiresAddress;
      const validationMatch = testCase.shouldFail ? !result.validation.isValid : result.validation.isValid;
      
      if (autoResolvableMatch && requiresAddressMatch && validationMatch) {
        console.log(`  🎯 PASS: All expectations met`);
      } else {
        console.log(`  ❌ FAIL: Expectations not met`);
        console.log(`    Expected auto-resolvable: ${testCase.expectedAutoResolvable}, got: ${result.data.autoResolvable}`);
        console.log(`    Expected requires address: ${testCase.expectedRequiresAddress}, got: ${result.data.platformSpecific?.requiresAddress}`);
        console.log(`    Expected validation: ${!testCase.shouldFail}, got: ${result.validation.isValid}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${testCase.name}":`, error);
    }
    
    console.log('─'.repeat(80));
  }
}

if (require.main === module) {
  testEnhancedValidation().catch(console.error);
}

export { testEnhancedValidation };
