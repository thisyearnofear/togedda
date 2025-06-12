#!/usr/bin/env ts-node

/**
 * XMTP Bot Test Script (TypeScript)
 * Tests the AI bot's XMTP connectivity and basic functionality
 */

import { config } from 'dotenv';
import { validateXMTPEnvironment, getBotConfiguration } from '../lib/xmtp-helpers';

// Load environment variables
config({ path: '.env.local' });

async function testBotConfiguration(): Promise<boolean> {
  console.log('🤖 Testing XMTP AI Bot Configuration...\n');
  
  try {
    // Use centralized validation
    console.log('📋 Checking environment variables...');
    const env = validateXMTPEnvironment();
    console.log('✅ All required environment variables found\n');
    
    // Get bot configuration
    const config = getBotConfiguration();
    
    console.log('🔧 Bot Configuration:');
    console.log(`Bot Address: ${config.BOT_ADDRESS}`);
    console.log(`XMTP Environment: ${config.XMTP_ENV}`);
    console.log(`OpenAI API Key: ${config.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`Base Sepolia RPC: ${config.BASE_SEPOLIA_RPC_URL}\n`);
    
    // Check XMTP environment
    const validEnvs = ['dev', 'production', 'local'];
    if (!validEnvs.includes(config.XMTP_ENV)) {
      console.error(`❌ Invalid XMTP environment. Should be one of: ${validEnvs.join(', ')}`);
      return false;
    }
    console.log('✅ XMTP environment is valid');
    
    console.log('\n🎉 Bot configuration test completed successfully!');
    console.log('\n📱 Next steps:');
    console.log('1. Start the bot service: npm run bot:dev');
    console.log('2. Go to https://xmtp.chat');
    console.log(`3. Send a message to: ${config.BOT_ADDRESS}`);
    console.log('4. Test prediction proposals with the bot');
    
    console.log('\n💡 To test the full XMTP integration:');
    console.log('1. Run: npm run bot:dev (starts bot service)');
    console.log('2. Test the frontend API endpoints');
    console.log('3. Verify end-to-end functionality');
    
    return true;
    
  } catch (error) {
    console.error('❌ Configuration error:', (error as Error).message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your .env.local file has all required variables');
    console.log('2. Run: npm run keys:generate to create new keys');
    console.log('3. Verify your OpenAI API key is valid');
    return false;
  }
}

async function testXMTPConnection(): Promise<boolean> {
  console.log('\n🔌 Testing XMTP client initialization...');
  
  try {
    const { initializeXMTPClient } = await import('../lib/xmtp-helpers');
    const config = getBotConfiguration();
    
    console.log('Initializing XMTP client...');
    const client = await initializeXMTPClient(
      config.BOT_PRIVATE_KEY,
      config.ENCRYPTION_KEY,
      config.XMTP_ENV as any
    );
    
    console.log('✅ XMTP client initialized successfully!');
    console.log(`📧 Inbox ID: ${client.inboxId}`);
    
    // Test conversation sync
    console.log('\n🔄 Syncing conversations...');
    await client.conversations.sync();
    console.log('✅ Conversations synced successfully!');
    
    // List existing conversations
    const conversations = await client.conversations.list();
    console.log(`📬 Found ${conversations.length} existing conversations`);
    
    return true;
    
  } catch (error) {
    console.error('❌ XMTP connection failed:', (error as Error).message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your private key is valid');
    console.log('3. Ensure encryption key is 32 bytes (64 hex characters)');
    console.log('4. Try regenerating keys if issues persist');
    return false;
  }
}

async function main(): Promise<void> {
  const configSuccess = await testBotConfiguration();
  
  if (configSuccess) {
    const connectionSuccess = await testXMTPConnection();
    process.exit(connectionSuccess ? 0 : 1);
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { testBotConfiguration, testXMTPConnection };
