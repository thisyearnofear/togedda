#!/usr/bin/env ts-node

/**
 * XMTP Key Generation Script (TypeScript)
 * Generates secure private key and encryption key for the AI bot
 */

import { config } from 'dotenv';
import { generateXMTPKeys } from '../../lib/xmtp-helpers';

// Load environment variables
config({ path: '.env.local' });

function main(): void {
  console.log('🔑 Generating XMTP keys for AI bot...\n');
  
  const keys = generateXMTPKeys();
  
  console.log('✅ Keys generated successfully!\n');
  console.log('📋 Copy these values to your .env.local file:\n');
  console.log('# XMTP AI Bot Configuration');
  console.log(`BOT_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`ENCRYPTION_KEY=${keys.encryptionKey}`);
  console.log(`XMTP_ENV=dev`);
  console.log(`OPENAI_API_KEY=sk-your-openai-api-key-here`);
  console.log(`BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`);
  console.log(`PREDICTION_BOT_XMTP_ADDRESS=${keys.address}`);
  
  console.log('\n📝 Bot Details:');
  console.log(`Bot Address: ${keys.address}`);
  console.log(`Private Key: ${keys.privateKey}`);
  console.log(`Encryption Key: ${keys.encryptionKey}`);
  
  console.log(`\n💡 Add these to your .env.local file manually`);
  console.log('⚠️  Remember to add your OpenAI API key!');
  console.log('🔒 Keep these keys secure and never commit them to version control!');
}

if (require.main === module) {
  main();
}

export { main as generateKeys };
