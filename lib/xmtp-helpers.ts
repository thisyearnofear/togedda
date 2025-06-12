/**
 * XMTP Helper Utilities
 * Centralized utilities for XMTP V3 SDK integration
 * Following DRY principles and best practices from ephemeraHQ/xmtp-agent-examples
 */

import { Client, type XmtpEnv, type Signer } from '@xmtp/node-sdk';
import { createWalletClient, http, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { DEFAULT_XMTP_ENV, VALIDATION } from './xmtp-constants';

/**
 * Environment variables validation for XMTP
 */
export const XMTP_REQUIRED_ENV_VARS = [
  'BOT_PRIVATE_KEY',
  'ENCRYPTION_KEY', 
  'XMTP_ENV'
] as const;

export function validateXMTPEnvironment() {
  const missing = XMTP_REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required XMTP environment variables: ${missing.join(', ')}`);
  }
  
  return {
    BOT_PRIVATE_KEY: process.env.BOT_PRIVATE_KEY!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    XMTP_ENV: process.env.XMTP_ENV! as XmtpEnv,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
}

/**
 * Create a signer from private key using XMTP V3 best practices
 */
export function createXMTPSigner(privateKey: string): Signer {
  const sanitizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(sanitizedKey as `0x${string}`);
  
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  });

  return {
    type: "EOA",
    getIdentifier: () => ({
      identifierKind: 0, // 0 = Ethereum address
      identifier: account.address.toLowerCase(),
    }),
    signMessage: async (message: string) => {
      const signature = await wallet.signMessage({
        message,
        account,
      });
      return toBytes(signature);
    },
  };
}

/**
 * Get encryption key from hex string
 */
export function getEncryptionKeyFromHex(hexKey: string): Uint8Array {
  return new Uint8Array(Buffer.from(hexKey.replace('0x', ''), 'hex'));
}

/**
 * Initialize XMTP client with proper configuration
 */
export async function initializeXMTPClient(
  privateKey: string,
  encryptionKey: string,
  env: XmtpEnv = DEFAULT_XMTP_ENV
): Promise<Client> {
  const signer = createXMTPSigner(privateKey);
  const dbEncryptionKey = getEncryptionKeyFromHex(encryptionKey);
  
  const client = await Client.create(signer, {
    dbEncryptionKey,
    env,
  });
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`✓ XMTP client initialized for address: ${account.address}`);
  console.log(`✓ Environment: ${env}`);
  console.log(`✓ Inbox ID: ${client.inboxId}`);
  
  return client;
}

/**
 * Generate secure keys for XMTP (development helper)
 */
export function generateXMTPKeys(): { privateKey: string; encryptionKey: string; address: string } {
  const wallet = require('ethers').Wallet.createRandom();
  const encryptionKey = require('ethers').hexlify(require('ethers').randomBytes(32));
  
  return {
    privateKey: wallet.privateKey,
    address: wallet.address,
    encryptionKey: encryptionKey
  };
}

/**
 * Validate key formats
 */
export function validateKeyFormats(privateKey: string, encryptionKey: string): boolean {
  // Validate private key format
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('Invalid private key format. Should be 0x followed by 64 hex characters.');
  }
  
  // Validate encryption key format
  if (!encryptionKey.startsWith('0x') || encryptionKey.length !== 66) {
    throw new Error('Invalid encryption key format. Should be 0x followed by 64 hex characters.');
  }
  
  return true;
}

/**
 * Get bot configuration from environment
 */
export function getBotConfiguration() {
  const env = validateXMTPEnvironment();
  validateKeyFormats(env.BOT_PRIVATE_KEY, env.ENCRYPTION_KEY);
  
  return {
    ...env,
    BOT_ADDRESS: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured',
    BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  };
}
