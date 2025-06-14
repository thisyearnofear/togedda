/**
 * Simple CDP test using JavaScript to avoid TypeScript issues
 */

require('dotenv').config({ path: '.env.local' });

async function simpleCdpTest() {
  console.log('🔍 Simple CDP Test\n');

  console.log('📋 Environment Check:');
  console.log(`CDP_API_KEY_NAME: ${process.env.CDP_API_KEY_NAME || 'NOT SET'}`);
  console.log(`CDP_API_KEY_PRIVATE_KEY: ${process.env.CDP_API_KEY_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);

  if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
    console.log('\n❌ CDP credentials not configured');
    return;
  }

  try {
    console.log('\n🚀 Testing CDP wallet provider...');
    const { CdpWalletProvider, AgentKit } = require('@coinbase/agentkit');
    
    // Try to create wallet provider
    const walletProvider = await CdpWalletProvider.configureWithWallet({
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      networkId: 'base-sepolia'
    });
    
    console.log('✅ CDP wallet provider created successfully!');
    
    // Get wallet details
    const address = await walletProvider.getAddress();
    console.log(`📧 Wallet Address: ${address}`);
    
    const network = await walletProvider.getNetwork();
    console.log(`🌐 Network: ${network}`);
    
    const name = await walletProvider.getName();
    console.log(`📛 Wallet Name: ${name}`);
    
    // Test balance
    try {
      const balance = await walletProvider.getBalance();
      console.log(`💰 Wallet Balance: ${balance} ETH`);
    } catch (balanceError) {
      console.log(`⚠️ Balance check failed: ${balanceError.message}`);
    }
    
    // Try to create AgentKit
    console.log('\n🤖 Testing AgentKit creation...');
    try {
      // Try different approaches
      console.log('Trying AgentKit.from with walletProvider...');
      const agentkit1 = AgentKit.from({ walletProvider });
      console.log('✅ AgentKit.from with walletProvider worked!');
      console.log(`Actions available: ${agentkit1.getActions().length}`);
    } catch (error1) {
      console.log(`❌ AgentKit.from with walletProvider failed: ${error1.message}`);
      
      try {
        console.log('Trying AgentKit.from with wallet...');
        const agentkit2 = AgentKit.from({ wallet: walletProvider });
        console.log('✅ AgentKit.from with wallet worked!');
        console.log(`Actions available: ${agentkit2.getActions().length}`);
      } catch (error2) {
        console.log(`❌ AgentKit.from with wallet failed: ${error2.message}`);
        
        try {
          console.log('Trying new AgentKit...');
          const agentkit3 = new AgentKit({ walletProvider });
          console.log('✅ new AgentKit worked!');
          console.log(`Actions available: ${agentkit3.getActions().length}`);
        } catch (error3) {
          console.log(`❌ new AgentKit failed: ${error3.message}`);
        }
      }
    }
    
    console.log('\n🎉 CDP wallet provider test completed successfully!');
    
  } catch (error) {
    console.log(`\n❌ CDP test failed: ${error.message}`);
    console.log('Error details:', error);
  }
}

simpleCdpTest().catch(console.error);
