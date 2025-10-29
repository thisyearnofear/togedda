import { sdk } from "@farcaster/miniapp-sdk";

export type MiniAppContext = {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  location?: {
    type:
      | "cast_embed"
      | "cast_share"
      | "notification"
      | "launcher"
      | "channel"
      | "open_miniapp";
    context?: any;
  };
  client?: {
    platformType?: "web" | "mobile";
    clientFid: number;
    added: boolean;
    safeAreaInsets?: any;
    notificationDetails?: any;
  };
  features?: {
    haptics: boolean;
    cameraAndMicrophoneAccess?: boolean;
  };
};

class MiniAppService {
  private _context: MiniAppContext | null = null;
  private _isReady = false;
  private _readyPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this._readyPromise) {
      return this._readyPromise;
    }

    this._readyPromise = this._initializeInternal();
    return this._readyPromise;
  }

  private async _initializeInternal(): Promise<void> {
    try {
      // Check if we're in a Mini App environment
      const isInMiniApp = await sdk.isInMiniApp();

      if (isInMiniApp) {
        // Get the context if in Mini App
        this._context = await sdk.context;
      }

      // Mark as ready to hide splash screen
      await sdk.actions.ready();

      this._isReady = true;
      console.log("Mini App SDK initialized successfully", this._context);
    } catch (error) {
      console.error("Failed to initialize Mini App SDK:", error);
      // Still mark as ready to prevent blocking the app
      try {
        await sdk.actions.ready();
      } catch (readyError) {
        console.error("Failed to mark app as ready:", readyError);
      }
      this._isReady = true;
    }
  }

  get context(): MiniAppContext | null {
    return this._context;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get user() {
    return this._context?.user;
  }

  get location() {
    return this._context?.location;
  }

  // Navigation helpers
  async openUrl(url: string): Promise<void> {
    try {
      await sdk.actions.openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      // Fallback to window.open
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      throw error;
    }
  }

  async composeCast(text?: string, embeds?: string[]): Promise<any> {
    try {
      const options: any = {};
      if (text) options.text = text;
      if (embeds && embeds.length > 0) {
        // SDK expects embeds as a specific format
        options.embeds = embeds.slice(0, 2); // Max 2 embeds
      }
      return await sdk.actions.composeCast(options);
    } catch (error) {
      console.error("Failed to compose cast:", error);
      throw error;
    }
  }

  // Haptic feedback
  async hapticImpact(
    style: "light" | "medium" | "heavy" = "medium"
  ): Promise<void> {
    try {
      await sdk.haptics.impactOccurred(style);
    } catch (error) {
      console.error("Failed to trigger haptic impact:", error);
    }
  }

  async hapticNotification(
    type: "success" | "warning" | "error" = "success"
  ): Promise<void> {
    try {
      await sdk.haptics.notificationOccurred(type);
    } catch (error) {
      console.error("Failed to trigger haptic notification:", error);
    }
  }

  async hapticSelection(): Promise<void> {
    try {
      await sdk.haptics.selectionChanged();
    } catch (error) {
      console.error("Failed to trigger haptic selection:", error);
    }
  }

  // Wallet integration
  async getEthereumProvider(): Promise<any> {
    try {
      return await sdk.wallet.ethProvider;
    } catch (error) {
      console.error("Failed to get Ethereum provider:", error);
      return null;
    }
  }

  async getSolanaProvider(): Promise<any> {
    try {
      return await sdk.wallet.getSolanaProvider();
    } catch (error) {
      console.error("Failed to get Solana provider:", error);
      return null;
    }
  }

  async connectWallet(): Promise<any> {
    try {
      const provider = await this.getEthereumProvider();
      if (!provider) {
        throw new Error("Ethereum provider not available");
      }

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      return accounts;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  // Navigation
  async close(): Promise<void> {
    try {
      await sdk.actions.close();
    } catch (error) {
      console.error("Failed to close:", error);
      // Fallback to window history
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
      }
    }
  }

  // Check if we're in Mini App environment
  async isInMiniApp(): Promise<boolean> {
    try {
      return await sdk.isInMiniApp();
    } catch (error) {
      console.error("Failed to check Mini App environment:", error);
      return false;
    }
  }

  // Utility methods
  isMiniApp(): boolean {
    return (
      typeof window !== "undefined" &&
      !!window.parent &&
      window.parent !== window
    );
  }

  isDesktop(): boolean {
    return this._context?.client?.platformType === "web";
  }

  isMobile(): boolean {
    return this._context?.client?.platformType === "mobile";
  }

  // Quick Auth methods (if available)
  async getAuthToken(): Promise<string | null> {
    try {
      // Check if quickAuth is available
      if ("quickAuth" in sdk && sdk.quickAuth) {
        return await (sdk.quickAuth as any).getToken();
      }
      return null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }

  async authenticatedFetch(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    try {
      // Check if quickAuth fetch is available
      if ("quickAuth" in sdk && sdk.quickAuth) {
        return await (sdk.quickAuth as any).fetch(url, options);
      }

      // Fallback to regular fetch
      return await fetch(url, options);
    } catch (error) {
      console.error("Authenticated fetch failed:", error);
      throw error;
    }
  }
}

// Singleton instance
export const miniApp = new MiniAppService();

// Utility function to check if we're in a Mini App environment
export function isMiniAppEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  // Check for Mini App specific window properties or parent frame
  return !!(
    window.parent &&
    window.parent !== window &&
    (window as any).webkit?.messageHandlers?.farcaster
  );
}

// Hook-like function for React components
export function useMiniAppContext(): MiniAppContext | null {
  return miniApp.context;
}

// Export the SDK directly for advanced use cases
export { sdk };
