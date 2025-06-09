"use client";

import { useEffect } from "react";

/**
 * Component to suppress common wallet extension errors that don't affect app functionality
 * These errors are caused by conflicts between multiple wallet extensions trying to
 * modify window.ethereum simultaneously
 */
export default function WalletErrorSuppressor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // List of error patterns to suppress
    const suppressedErrorPatterns = [
      /Cannot set property ethereum of.*which has only a getter/,
      /pageProvider\.js/,
      /KeyRing is locked/,
      /MetaMask.*already exists/,
      /Wallet connection.*already in progress/,
      /Provider.*already injected/,
      /ethereum.*read-only/,
    ];

    // Override console.error to filter wallet extension errors
    console.error = (...args) => {
      const message = args.join(" ");
      const shouldSuppress = suppressedErrorPatterns.some((pattern) =>
        pattern.test(message)
      );

      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      const shouldSuppress = suppressedErrorPatterns.some(
        (pattern) =>
          pattern.test(event.message || "") ||
          pattern.test(event.filename || "") ||
          pattern.test(event.error?.message || "")
      );

      if (shouldSuppress) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason?.toString() || "";
      const shouldSuppress = suppressedErrorPatterns.some((pattern) =>
        pattern.test(message)
      );

      if (shouldSuppress) {
        event.preventDefault();
        return false;
      }
    };

    // Add event listeners
    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);

    // Handle multiple wallet providers
    const handleWalletConflicts = () => {
      try {
        if (window.ethereum) {
          // If multiple providers exist, prioritize them
          if (Array.isArray(window.ethereum.providers)) {
            // Find MetaMask or use the first provider
            const metaMask = window.ethereum.providers.find(
              (provider: any) => provider.isMetaMask
            );
            const coinbase = window.ethereum.providers.find(
              (provider: any) => provider.isCoinbaseWallet
            );

            // Use MetaMask if available, otherwise Coinbase, otherwise first provider
            window.ethereum =
              metaMask || coinbase || window.ethereum.providers[0];
          }

          // Suppress provider override warnings
          if (window.ethereum.setProvider) {
            const originalSetProvider = window.ethereum.setProvider;
            window.ethereum.setProvider = function (...args: any[]) {
              try {
                return originalSetProvider.apply(this, args);
              } catch (error) {
                // Suppress provider setting errors
                return false;
              }
            };
          }
        }
      } catch (error) {
        // Ignore wallet conflict resolution errors
      }
    };

    // Run wallet conflict handling
    handleWalletConflicts();

    // Run again after a short delay to catch late-loading extensions
    const timeoutId = setTimeout(handleWalletConflicts, 1000);

    // Cleanup function
    return () => {
      // Restore original console methods
      console.error = originalError;
      console.warn = originalWarn;

      // Remove event listeners
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);

      // Clear timeout
      clearTimeout(timeoutId);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Higher-order component to wrap components with wallet error suppression
 */
export function withWalletErrorSuppression<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => (
    <>
      <WalletErrorSuppressor />
      <Component {...props} />
    </>
  );

  WrappedComponent.displayName = `withWalletErrorSuppression(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

/**
 * Hook to manually suppress wallet errors in a component
 */
export function useWalletErrorSuppression() {
  const suppressWalletError = (error: any) => {
    const message = error?.message || error?.toString() || "";
    const suppressedPatterns = [
      /Cannot set property ethereum/,
      /pageProvider\.js/,
      /KeyRing is locked/,
      /MetaMask.*already exists/,
    ];

    return suppressedPatterns.some((pattern) => pattern.test(message));
  };

  return { suppressWalletError };
}
