/**
 * Basenames Integration for XMTP Prediction Bot
 * Integrates Base's naming service for user-friendly addresses
 * 
 * Features:
 * - Resolve .base.eth names to addresses
 * - Register new Basenames
 * - Enhanced user experience with human-readable names
 * - Integration with prediction creation flow
 */

import { ethers } from 'ethers';

// L2Resolver ABI for Basenames (official Base implementation)
const L2_RESOLVER_ABI = [
  {
    "inputs": [{"internalType": "bytes32", "name": "node", "type": "bytes32"}],
    "name": "addr",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "addr", "type": "address"}],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Base Sepolia L2Resolver contract address
const BASE_SEPOLIA_L2_RESOLVER = "0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA";
const BASE_MAINNET_L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";

export interface BasenameResolution {
  address: string | null;
  basename: string | null;
  isValid: boolean;
  source: 'basenames' | 'ens' | 'web3bio' | 'direct';
}

export class BasenamesService {
  private provider: ethers.Provider;
  private resolverContract: ethers.Contract;
  private isMainnet: boolean;

  constructor(isMainnet: boolean = false) {
    this.isMainnet = isMainnet;
    
    // Set up provider based on network
    const rpcUrl = isMainnet 
      ? 'https://mainnet.base.org'
      : 'https://sepolia.base.org';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Set up resolver contract
    const resolverAddress = isMainnet 
      ? BASE_MAINNET_L2_RESOLVER 
      : BASE_SEPOLIA_L2_RESOLVER;
    
    this.resolverContract = new ethers.Contract(
      resolverAddress,
      L2_RESOLVER_ABI,
      this.provider
    );
  }

  /**
   * Resolve a Basename to an address
   */
  async resolveBasename(basename: string): Promise<string | null> {
    try {
      console.log(`🔍 Resolving Basename: ${basename}`);

      // Normalize the basename
      const normalizedName = this.normalizeBasename(basename);
      if (!normalizedName) {
        return null;
      }

      // Convert name to namehash
      const namehash = this.namehash(normalizedName);
      
      // Resolve using L2Resolver
      const address = await this.resolverContract.addr(namehash);
      
      if (address && address !== ethers.ZeroAddress) {
        console.log(`✅ Resolved ${basename} → ${address}`);
        return address;
      }

      console.log(`❌ Could not resolve Basename: ${basename}`);
      return null;
    } catch (error) {
      console.error(`❌ Error resolving Basename ${basename}:`, error);
      return null;
    }
  }

  /**
   * Reverse resolve an address to a Basename
   */
  async reverseResolveAddress(address: string): Promise<string | null> {
    try {
      console.log(`🔍 Reverse resolving address: ${address}`);

      // Validate address
      if (!ethers.isAddress(address)) {
        return null;
      }

      // Use reverse resolver
      const basename = await this.resolverContract.name(address);
      
      if (basename && basename.length > 0) {
        console.log(`✅ Reverse resolved ${address} → ${basename}`);
        return basename;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error reverse resolving address ${address}:`, error);
      return null;
    }
  }

  /**
   * Enhanced resolution with multiple fallbacks
   */
  async enhancedResolve(input: string): Promise<BasenameResolution> {
    // Validate input
    if (!input || typeof input !== 'string') {
      return {
        address: null,
        basename: null,
        isValid: false,
        source: 'direct'
      };
    }

    // Check if input is already an address
    if (ethers.isAddress(input)) {
      const basename = await this.reverseResolveAddress(input);
      return {
        address: input,
        basename,
        isValid: true,
        source: 'direct'
      };
    }

    // Try Basenames first
    const inputStr = String(input); // Ensure it's a string
    if (inputStr.endsWith('.base.eth') || inputStr.endsWith('.base')) {
      const address = await this.resolveBasename(inputStr);
      if (address) {
        return {
          address,
          basename: inputStr,
          isValid: true,
          source: 'basenames'
        };
      }
    }

    // Fallback to web3.bio API
    try {
      const web3bioResult = await this.resolveViaWeb3Bio(inputStr);
      if (web3bioResult.address) {
        return {
          ...web3bioResult,
          source: 'web3bio'
        };
      }
    } catch (error) {
      console.log('Web3.bio fallback failed:', error);
    }

    // No resolution found
    return {
      address: null,
      basename: null,
      isValid: false,
      source: 'direct'
    };
  }

  /**
   * Fallback to web3.bio API for ENS and other names
   */
  private async resolveViaWeb3Bio(input: string): Promise<BasenameResolution> {
    try {
      const apiKey = process.env.WEB3_BIO_API_KEY;
      if (!apiKey) {
        throw new Error('Web3.bio API key not configured');
      }

      const response = await fetch(`https://api.web3.bio/profile/${input}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Web3.bio API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract address from response
      const address = data?.address || data?.identity || null;
      
      return {
        address,
        basename: input,
        isValid: !!address,
        source: 'web3bio'
      };
    } catch (error) {
      console.error('Web3.bio resolution error:', error);
      return {
        address: null,
        basename: null,
        isValid: false,
        source: 'web3bio'
      };
    }
  }

  /**
   * Normalize basename for resolution
   */
  private normalizeBasename(basename: string): string | null {
    if (!basename || typeof basename !== 'string') {
      return null;
    }

    let normalized = basename.toLowerCase().trim();

    // Add .base.eth if not present
    if (!normalized.endsWith('.base.eth') && !normalized.endsWith('.base')) {
      if (normalized.includes('.')) {
        // Might be ENS or other domain
        return normalized;
      } else {
        // Add .base.eth for Basenames
        normalized = `${normalized}.base.eth`;
      }
    }

    return normalized;
  }

  /**
   * Generate namehash for ENS/Basenames resolution
   */
  private namehash(name: string): string {
    let node = ethers.ZeroHash;
    
    if (name) {
      const labels = name.split('.');
      for (let i = labels.length - 1; i >= 0; i--) {
        const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
        node = ethers.keccak256(ethers.concat([node, labelHash]));
      }
    }
    
    return node;
  }

  /**
   * Check if a basename is available for registration
   */
  async isBasenameAvailable(basename: string): Promise<boolean> {
    try {
      const address = await this.resolveBasename(basename);
      return !address || address === ethers.ZeroAddress;
    } catch (error) {
      console.error('Error checking basename availability:', error);
      return false;
    }
  }

  /**
   * Get network info
   */
  getNetworkInfo(): { network: string; resolverAddress: string } {
    return {
      network: this.isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      resolverAddress: this.isMainnet ? BASE_MAINNET_L2_RESOLVER : BASE_SEPOLIA_L2_RESOLVER
    };
  }
}

// Singleton instances
let basenamesServiceMainnet: BasenamesService | null = null;
let basenamesServiceTestnet: BasenamesService | null = null;

/**
 * Get Basenames service instance
 */
export function getBasenamesService(isMainnet: boolean = false): BasenamesService {
  if (isMainnet) {
    if (!basenamesServiceMainnet) {
      basenamesServiceMainnet = new BasenamesService(true);
    }
    return basenamesServiceMainnet;
  } else {
    if (!basenamesServiceTestnet) {
      basenamesServiceTestnet = new BasenamesService(false);
    }
    return basenamesServiceTestnet;
  }
}

/**
 * Enhanced username resolution for prediction creation
 */
export async function resolveUsernameForPrediction(
  username: string,
  preferMainnet: boolean = false
): Promise<{
  address: string | null;
  displayName: string;
  source: string;
  isResolved: boolean;
}> {
  try {
    console.log(`🔍 Resolving username for prediction: ${username}`);

    // Try both networks
    const testnetService = getBasenamesService(false);
    const mainnetService = getBasenamesService(true);

    // Try preferred network first
    const primaryService = preferMainnet ? mainnetService : testnetService;
    const secondaryService = preferMainnet ? testnetService : mainnetService;

    let result = await primaryService.enhancedResolve(username);
    
    if (!result.isValid) {
      // Try secondary network
      result = await secondaryService.enhancedResolve(username);
    }

    return {
      address: result.address,
      displayName: result.basename || username,
      source: result.source,
      isResolved: result.isValid
    };
  } catch (error) {
    console.error('Username resolution error:', error);
    return {
      address: null,
      displayName: username,
      source: 'error',
      isResolved: false
    };
  }
}

/**
 * Format resolution result for UI display
 */
export function formatResolutionForDisplay(
  username: string,
  resolution: BasenameResolution
): string {
  if (!resolution.isValid || !resolution.address) {
    return `❌ Could not resolve "${username}"`;
  }

  const shortAddress = `${resolution.address.slice(0, 6)}...${resolution.address.slice(-4)}`;
  const sourceEmoji = {
    'basenames': '🔵',
    'ens': '🌐',
    'web3bio': '🔗',
    'direct': '📍'
  }[resolution.source] || '🔍';

  return `${sourceEmoji} ${resolution.basename || username} → ${shortAddress}`;
}
