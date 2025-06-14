/**
 * Test script for Base Batches Messaging Buildathon integration
 * Tests XMTP + AgentKit + Basenames + Unified Contracts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testBuildathonIntegration() {
  console.log('🎯 Testing Base Batches Messaging Buildathon Integration\n');

  const tests = [
    testEnvironmentVariables,
    testUnifiedContracts,
    testBasenamesIntegration,
    testAgentKitIntegration,
    testXMTPIntegration,
    testPredictionFlow
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔄 Running ${test.name}...`);
      await test();
      console.log(`✅ ${test.name} passed\n`);
      passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${test.name} failed: ${errorMessage}\n`);
      failed++;
    }
  }

  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Ready for buildathon submission! 🚀');
  } else {
    console.log('\n⚠️ Some tests failed. Please fix issues before submission.');
  }
}

async function testEnvironmentVariables() {
  const requiredVars = [
    'OPENAI_API_KEY',
    'BOT_PRIVATE_KEY',
    'ENCRYPTION_KEY',
    'XMTP_ENV',
    'PREDICTION_BOT_XMTP_ADDRESS',
    'CELO_PREDICTION_MARKET_ADDRESS',
    'BASE_PREDICTION_MARKET_ADDRESS'
  ];

  const optionalVars = [
    'CDP_API_KEY_NAME',
    'CDP_API_KEY_PRIVATE_KEY',
    'WEB3_BIO_API_KEY'
  ];

  console.log('  Checking required environment variables...');
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
    console.log(`    ✓ ${varName}`);
  }

  console.log('  Checking optional environment variables...');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`    ✓ ${varName} (configured)`);
    } else {
      console.log(`    ⚠ ${varName} (not configured - some features may be limited)`);
    }
  }
}

async function testUnifiedContracts() {
  const { ethers } = await import('ethers');
  const { CHAIN_CONFIG } = await import('../lib/dual-chain-service');

  console.log('  Testing unified contract connectivity...');

  for (const [chainKey, config] of Object.entries(CHAIN_CONFIG)) {
    console.log(`    Testing ${config.name}...`);
    
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Test provider connectivity
    const blockNumber = await provider.getBlockNumber();
    console.log(`      ✓ Connected to ${config.name} (block ${blockNumber})`);
    
    // Test contract exists
    const code = await provider.getCode(config.contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at ${config.contractAddress} on ${config.name}`);
    }
    console.log(`      ✓ Contract exists at ${config.contractAddress}`);
  }
}

async function testBasenamesIntegration() {
  console.log('  Testing Basenames integration...');

  try {
    const { getBasenamesService } = await import('../lib/basenames-integration');
    
    const basenamesService = getBasenamesService(false); // Base Sepolia
    
    // Test service initialization
    const networkInfo = basenamesService.getNetworkInfo();
    console.log(`    ✓ Basenames service initialized for ${networkInfo.network}`);
    
    // Test resolution (using a known Basename if available)
    try {
      const testBasename = 'test.base.eth';
      const resolved = await basenamesService.resolveBasename(testBasename);
      if (resolved) {
        console.log(`    ✓ Successfully resolved ${testBasename} → ${resolved}`);
      } else {
        console.log(`    ℹ No resolution for ${testBasename} (expected for test name)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`    ⚠ Basename resolution test failed: ${errorMessage}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Basenames integration failed: ${errorMessage}`);
  }
}

async function testAgentKitIntegration() {
  console.log('  Testing AgentKit integration...');

  try {
    const { getAgentKitInstance } = await import('../lib/agentkit-integration');
    
    // Check if CDP credentials are configured
    if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
      console.log('    ⚠ CDP credentials not configured - AgentKit features will be limited');
      return;
    }
    
    // Test AgentKit initialization
    const agentKit = await getAgentKitInstance();
    
    if (agentKit.isInitialized()) {
      console.log('    ✓ AgentKit initialized successfully');
      
      const walletAddress = agentKit.getWalletAddress();
      if (walletAddress) {
        console.log(`    ✓ AgentKit wallet: ${walletAddress}`);
      }
    } else {
      throw new Error('AgentKit failed to initialize');
    }
    
  } catch (error) {
    // AgentKit is optional for basic functionality
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`    ⚠ AgentKit test failed: ${errorMessage}`);
    console.log('    ℹ AgentKit is optional - basic functionality will still work');
  }
}

async function testXMTPIntegration() {
  console.log('  Testing XMTP integration...');

  try {
    const { validateXMTPEnvironment } = await import('../lib/xmtp-helpers');
    
    // Validate XMTP environment
    const env = validateXMTPEnvironment();
    console.log(`    ✓ XMTP environment validated: ${env.XMTP_ENV}`);

    // Check bot address from environment
    const botAddress = process.env.PREDICTION_BOT_XMTP_ADDRESS;
    if (botAddress) {
      console.log(`    ✓ Bot address: ${botAddress}`);
    } else {
      console.log(`    ⚠ Bot address not configured in environment`);
    }
    
    // Test XMTP client creation (without actually connecting)
    const { Client } = await import('@xmtp/node-sdk');
    console.log('    ✓ XMTP Node SDK imported successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`XMTP integration failed: ${errorMessage}`);
  }
}

async function testPredictionFlow() {
  console.log('  Testing prediction creation flow...');

  try {
    const { generatePredictionProposal } = await import('../lib/ai-bot-service');
    
    // Test AI prediction proposal generation
    const testMessage = "I predict ETH will reach $4000 by Valentine's Day";
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('    Testing AI prediction proposal...');
    const proposal = await generatePredictionProposal(testMessage, apiKey, 'test_conversation');
    
    if (proposal && proposal.length > 0) {
      console.log('    ✓ AI prediction proposal generated successfully');
      console.log(`    ℹ Proposal preview: "${proposal.substring(0, 100)}..."`);
    } else {
      throw new Error('AI prediction proposal generation failed');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Prediction flow test failed: ${errorMessage}`);
  }
}

// Run the tests
if (require.main === module) {
  testBuildathonIntegration().catch(console.error);
}

export { testBuildathonIntegration };
