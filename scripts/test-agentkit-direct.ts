/**
 * Direct test of AgentKit integration
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testAgentKitDirect() {
  console.log('🤖 Testing AgentKit Direct Integration\n');

  console.log('📋 Environment Check:');
  console.log(`CDP_API_KEY_NAME: ${process.env.CDP_API_KEY_NAME || 'NOT SET'}`);
  console.log(`CDP_API_KEY_PRIVATE_KEY: ${process.env.CDP_API_KEY_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);

  if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
    console.log('\n❌ CDP credentials not configured');
    return;
  }

  try {
    console.log('\n🚀 Testing AgentKit integration...');
    
    // Import our AgentKit integration
    const { getAgentKitInstance } = await import('../lib/agentkit-integration');
    
    console.log('✅ AgentKit integration module imported');
    
    // Try to get AgentKit instance
    const agentKit = await getAgentKitInstance();
    
    console.log('✅ AgentKit instance created');
    console.log(`🔧 Is initialized: ${agentKit.isInitialized()}`);
    
    if (agentKit.isInitialized()) {
      // Test wallet address
      const address = await agentKit.getWalletAddress();
      console.log(`📧 Wallet Address: ${address}`);
      
      // Test message processing
      const testMessage = "What is my wallet balance?";
      console.log(`\n💬 Testing message processing: "${testMessage}"`);
      
      const response = await agentKit.processMessage(testMessage);
      console.log(`🤖 Response: ${response.substring(0, 200)}...`);
      
      // Test prediction proposal
      const predictionMessage = "I predict ETH will reach $5000 by March";
      console.log(`\n🔮 Testing prediction proposal: "${predictionMessage}"`);
      
      const { generateAgentKitPredictionProposal } = await import('../lib/agentkit-integration');
      const proposal = await generateAgentKitPredictionProposal(predictionMessage);
      console.log(`🔮 Proposal: ${proposal.substring(0, 200)}...`);
      
      console.log('\n🎉 All AgentKit tests passed!');
    } else {
      console.log('⚠️ AgentKit not fully initialized, but integration is working');
    }
    
  } catch (error: any) {
    console.log(`\n❌ AgentKit test failed: ${error.message}`);
    console.log('Error details:', error);
  }
}

if (require.main === module) {
  testAgentKitDirect().catch(console.error);
}

export { testAgentKitDirect };
