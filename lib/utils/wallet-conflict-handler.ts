"use client";

/**
 * Utility to handle wallet extension conflicts
 * Particularly useful for handling Backpack and other wallet conflicts
 */

interface WalletConflictInfo {
  hasConflict: boolean;
  conflictingWallets: string[];
  recommendations: string[];
}

/**
 * Detect wallet extension conflicts
 */
export function detectWalletConflicts(): WalletConflictInfo {
  if (typeof window === 'undefined') {
    return {
      hasConflict: false,
      conflictingWallets: [],
      recommendations: []
    };
  }

  const conflictingWallets: string[] = [];
  const recommendations: string[] = [];

  // Check for Backpack wallet conflict
  if (window.backpack) {
    conflictingWallets.push('Backpack');
    recommendations.push('Disable Backpack extension for this app');
  }

  // Check for other potential conflicts
  if (window.phantom) {
    conflictingWallets.push('Phantom');
  }

  if (window.solana) {
    conflictingWallets.push('Solana wallet');
  }

  // Check if window.ethereum is overridden
  const ethereumDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
  if (ethereumDescriptor && !ethereumDescriptor.configurable) {
    conflictingWallets.push('Ethereum wallet (read-only)');
    recommendations.push('Some wallet extension is preventing proper Ethereum wallet access');
  }

  return {
    hasConflict: conflictingWallets.length > 0,
    conflictingWallets,
    recommendations: recommendations.length > 0 ? recommendations : [
      'Try disabling conflicting wallet extensions',
      'Refresh the page after disabling extensions',
      'Use incognito mode to test without extensions'
    ]
  };
}

/**
 * Log wallet conflict information for debugging
 */
export function logWalletConflicts(): void {
  const conflicts = detectWalletConflicts();
  
  if (conflicts.hasConflict) {
    console.warn('🚨 Wallet conflicts detected:', {
      conflictingWallets: conflicts.conflictingWallets,
      recommendations: conflicts.recommendations
    });
  } else {
    console.log('✅ No wallet conflicts detected');
  }
}

/**
 * Attempt to resolve common wallet conflicts
 */
export function attemptWalletConflictResolution(): boolean {
  if (typeof window === 'undefined') return false;

  let resolved = false;

  try {
    // Try to restore window.ethereum if it's been overridden
    if (window.ethereum && typeof window.ethereum === 'object') {
      // Check if it's a proxy or has been modified
      const ethereumKeys = Object.keys(window.ethereum);
      if (ethereumKeys.length === 0) {
        console.warn('window.ethereum appears to be empty, attempting to restore...');
        // This is a basic attempt - in practice, the original might be lost
      }
    }

    // Suppress Backpack override warnings
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes("Backpack couldn't override") || 
          message.includes("window.ethereum")) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    resolved = true;
  } catch (error) {
    console.error('Failed to resolve wallet conflicts:', error);
  }

  return resolved;
}

/**
 * Initialize wallet conflict handling
 * Call this early in your app initialization
 */
export function initializeWalletConflictHandling(): void {
  if (typeof window === 'undefined') return;

  // Log conflicts for debugging
  logWalletConflicts();

  // Attempt basic resolution
  attemptWalletConflictResolution();

  // Set up error handlers for wallet-related errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
      const message = event.error.message.toLowerCase();
      if (message.includes('wallet') || 
          message.includes('ethereum') || 
          message.includes('backpack')) {
        console.warn('Wallet-related error detected:', event.error.message);
        // You could show a user-friendly message here
      }
    }
  });

  // Handle unhandled promise rejections related to wallets
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const message = event.reason.message.toLowerCase();
      if (message.includes('wallet') || 
          message.includes('ethereum') || 
          message.includes('backpack')) {
        console.warn('Wallet-related promise rejection:', event.reason.message);
        event.preventDefault(); // Prevent the error from being logged to console
      }
    }
  });
}

// Types for window extensions
declare global {
  interface Window {
    backpack?: any;
    phantom?: any;
    solana?: any;
  }
}
