#!/usr/bin/env ts-node

/**
 * Setup script for Enhanced Message Store
 * 
 * This script helps set up and test the enhanced message store with PostgreSQL and Redis
 */

import { enhancedMessageStore } from '../../lib/enhanced-message-store';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function setupMessageStore() {
  console.log('🚀 Setting up Enhanced Message Store...\n');

  try {
    // Test PostgreSQL connection
    console.log('1. Testing PostgreSQL connection...');
    const testMessage = {
      id: `test_${Date.now()}`,
      conversationId: 'test_conversation',
      senderAddress: '0x1234567890123456789012345678901234567890',
      content: 'Test message for setup',
      timestamp: Date.now(),
      messageType: 'user' as const,
      metadata: {
        actionType: 'general' as const,
      },
    };

    await enhancedMessageStore.addMessage(testMessage);
    console.log('✅ PostgreSQL connection successful');

    // Test message retrieval
    console.log('\n2. Testing message retrieval...');
    const messages = await enhancedMessageStore.getMessages('test_conversation', 10);
    console.log(`✅ Retrieved ${messages.length} messages`);

    // Test conversation stats
    console.log('\n3. Testing conversation statistics...');
    const stats = await enhancedMessageStore.getConversationStats('test_conversation');
    console.log(`✅ Conversation stats: ${JSON.stringify(stats, null, 2)}`);

    // Test conversations list
    console.log('\n4. Testing conversations list...');
    const conversations = await enhancedMessageStore.getConversations();
    console.log(`✅ Found ${conversations.length} conversations`);

    console.log('\n🎉 Enhanced Message Store setup completed successfully!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   - PostgreSQL: ✅ Connected`);
    console.log(`   - Redis: ${process.env.REDIS_URL ? '✅ Configured' : '⚠️ Not configured (optional)'}`);
    console.log(`   - XMTP Sync: ${process.env.XMTP_ENV ? '✅ Enabled' : '⚠️ Not configured'}`);

    if (!process.env.REDIS_URL) {
      console.log('\n💡 Redis Setup (Optional but Recommended):');
      console.log('   For better performance, consider setting up Redis:');
      console.log('   1. Local Redis: REDIS_URL="redis://localhost:6379"');
      console.log('   2. Upstash Redis: Get free Redis at https://upstash.com');
      console.log('   3. Railway Redis: Add Redis service to your Railway project');
    }

    if (!process.env.XMTP_ENV) {
      console.log('\n💡 XMTP Setup:');
      console.log('   For XMTP sync functionality, set:');
      console.log('   - XMTP_ENV="dev" (or "production")');
      console.log('   - BOT_PRIVATE_KEY="0x..." (generate with npm run keys:generate)');
      console.log('   - ENCRYPTION_KEY="0x..." (generate with npm run keys:generate)');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('connect ECONNREFUSED')) {
        console.log('\n💡 Database Connection Issue:');
        console.log('   Make sure your DATABASE_URL is correct in .env.local');
        console.log('   For Neon PostgreSQL, the format is:');
        console.log('   DATABASE_URL="postgresql://username:password@host/database?sslmode=require"');
      }
      
      if (error.message.includes('Redis')) {
        console.log('\n💡 Redis Connection Issue:');
        console.log('   Redis is optional. The system will work with PostgreSQL only.');
        console.log('   To disable Redis warnings, remove REDIS_URL from your .env.local');
      }
    }
    
    process.exit(1);
  } finally {
    // Clean up
    await enhancedMessageStore.close();
  }
}

async function testMessageFlow() {
  console.log('\n🧪 Testing complete message flow...\n');

  try {
    // Simulate a conversation
    const conversationId = `test_conv_${Date.now()}`;
    const userAddress = '0x1234567890123456789012345678901234567890';
    const botAddress = '0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c';

    // User sends message
    const userMessage = {
      id: `user_${Date.now()}`,
      conversationId,
      senderAddress: userAddress,
      content: 'Hello, can you help me create a prediction?',
      timestamp: Date.now(),
      messageType: 'user' as const,
      metadata: {
        actionType: 'query' as const,
      },
    };

    await enhancedMessageStore.addMessage(userMessage);
    console.log('✅ User message stored');

    // Bot responds
    const botMessage = {
      id: `bot_${Date.now()}`,
      conversationId,
      senderAddress: botAddress,
      content: 'Sure! I can help you create a prediction. What would you like to predict?',
      timestamp: Date.now() + 1000,
      messageType: 'bot' as const,
      metadata: {
        actionType: 'general' as const,
      },
    };

    await enhancedMessageStore.addMessage(botMessage);
    console.log('✅ Bot message stored');

    // Retrieve conversation
    const messages = await enhancedMessageStore.getMessages(conversationId);
    console.log(`✅ Retrieved ${messages.length} messages from conversation`);

    // Display conversation
    console.log('\n💬 Conversation:');
    messages.forEach(msg => {
      const sender = msg.messageType === 'user' ? 'User' : 'Bot';
      console.log(`   ${sender}: ${msg.content}`);
    });

    console.log('\n🎉 Message flow test completed successfully!');

  } catch (error) {
    console.error('❌ Message flow test failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  switch (command) {
    case 'setup':
      await setupMessageStore();
      break;
    case 'test':
      await setupMessageStore();
      await testMessageFlow();
      break;
    case 'help':
      console.log('Enhanced Message Store Setup Script\n');
      console.log('Usage: npm run setup:message-store [command]\n');
      console.log('Commands:');
      console.log('  setup (default) - Set up and test basic functionality');
      console.log('  test           - Run setup + complete message flow test');
      console.log('  help           - Show this help message');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "npm run setup:message-store help" for usage information');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
