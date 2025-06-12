#!/usr/bin/env node

/**
 * Script to get the XMTP inbox ID for your prediction bot
 * 
 * This script will:
 * 1. Create an XMTP client using your bot's private key
 * 2. Display the inbox ID that should be used in your environment variables
 * 3. Help you verify the bot is properly configured
 * 
 * Usage:
 *   node scripts/get-xmtp-inbox-id.js
 * 
 * Make sure you have BOT_PRIVATE_KEY and ENCRYPTION_KEY in your .env.local
 */

const { Client } = require("@xmtp/node-sdk");
const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains");

async function getXMTPInboxId() {
  try {
    console.log("🔄 Getting XMTP inbox ID for prediction bot...");
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const botPrivateKey = process.env.BOT_PRIVATE_KEY;
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const xmtpEnv = process.env.XMTP_ENV || "dev";
    
    if (!botPrivateKey) {
      throw new Error("BOT_PRIVATE_KEY not found in environment variables");
    }
    
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY not found in environment variables");
    }
    
    console.log(`📡 Using XMTP environment: ${xmtpEnv}`);
    console.log(`🔑 Bot address: ${process.env.PREDICTION_BOT_XMTP_ADDRESS}`);
    
    // Create wallet from private key
    const account = privateKeyToAccount(botPrivateKey);
    const wallet = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    
    console.log("🔄 Creating XMTP client...");
    
    // Create XMTP client
    const client = await Client.create(wallet, {
      env: xmtpEnv,
      encryptionKey: Buffer.from(encryptionKey.replace('0x', ''), 'hex'),
    });
    
    console.log("✅ XMTP client created successfully!");
    console.log("");
    console.log("📋 Bot Configuration:");
    console.log("=".repeat(50));
    console.log(`Inbox ID: ${client.inboxId}`);
    console.log(`Address: ${client.accountAddress}`);
    console.log(`Environment: ${xmtpEnv}`);
    console.log("=".repeat(50));
    console.log("");
    console.log("🔧 Update your environment variables:");
    console.log(`NEXT_PUBLIC_XMTP_BOT_INBOX_ID=${client.inboxId}`);
    console.log("");
    console.log("✅ Your bot is ready to receive XMTP messages!");
    
  } catch (error) {
    console.error("❌ Error getting XMTP inbox ID:", error.message);
    console.log("");
    console.log("🔍 Troubleshooting:");
    console.log("1. Make sure BOT_PRIVATE_KEY is set in .env.local");
    console.log("2. Make sure ENCRYPTION_KEY is set in .env.local");
    console.log("3. Check that your private key is valid (starts with 0x)");
    console.log("4. Ensure you have internet connection for XMTP network");
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  getXMTPInboxId();
}

module.exports = { getXMTPInboxId };
