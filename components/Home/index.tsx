"use client";

import { useSimpleUser } from "@/hooks/use-simple-user";
import {
  NetworkData,
  fetchAllNetworksData,
  calculateCollectiveGoals,
  CollectiveGoals,
} from "@/lib/blockchain";
import {
  AppModeIndicator,
  MiniAppOnly,
  WebAppOnly,
} from "@/contexts/app-mode-context";
import Web3Profile from "@/components/Web3Profile";
import AuthFlow from "@/components/AuthFlow";
import { Tab } from "@/src/types";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import WebAppErrorBoundary from "@/components/WebAppErrorBoundary";
import WebAppNavigation from "@/components/WebAppNavigation";
import NetworkSelector from "@/components/NetworkSelector";
import Leaderboard from "@/components/Leaderboard";
import NetworkContributions from "@/components/NetworkContributions";
import PredictionMarket from "@/components/PredictionMarket";
import PersonalDashboard from "@/components/PersonalDashboard";
import CollectiveGoalsComponent from "@/components/CollectiveGoals";
import { useAccount, useDisconnect } from "wagmi";

export default function Home() {
  const {
    isAuthenticated,
    user,
    isFarcasterUser,
    isWalletUser: isWalletOnlyUser,
    isLoading: authLoading,
  } = useSimpleUser();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  // State variables
  const [selectedTab, setSelectedTabInternal] = useState<Tab>("goals");

  // Wrap setSelectedTab for potential debugging
  const setSelectedTab = useCallback((tab: Tab) => {
    setSelectedTabInternal(tab);
  }, []);

  // Tab change tracking (for debugging if needed)
  // useEffect(() => {
  //   console.log(`[DEBUG] Tab changed to: ${selectedTab}`);
  // }, [selectedTab]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);
  const authError = null; // No longer needed with simplified auth
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData>({});
  const [goals, setGoals] = useState<CollectiveGoals | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

  // Use the unified auth user as current user
  const currentUser = user;

  // Lazy load blockchain data only when user interacts or is authenticated
  const loadBlockchainData = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && (dataLoaded || isLoading)) return;

      console.log("Starting to load blockchain data...", { forceRefresh });
      setIsLoading(true);
      try {
        // Use forceRefresh to get latest data, especially for collective goals
        const data = await fetchAllNetworksData(forceRefresh);
        console.log("Fetched network data:", data);
        setNetworkData(data);

        const calculatedGoals = calculateCollectiveGoals(data);
        console.log("Calculated goals:", calculatedGoals);
        if (calculatedGoals) {
          setGoals(calculatedGoals);
        } else {
          console.error("Failed to calculate goals from data:", data);
        }
        if (!dataLoaded) setDataLoaded(true);
      } catch (error) {
        console.error("Error fetching blockchain data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [dataLoaded, isLoading]
  );

  // Refresh function for collective goals - uses server-side API for freshest data
  const refreshCollectiveGoals = useCallback(async () => {
    console.log("Refreshing collective goals with server-side API...");
    setIsLoading(true);
    try {
      const response = await fetch("/api/collective-goals?force=true");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setGoals(result.goals);
          setNetworkData(result.networkData);
          console.log("Collective goals refreshed via API:", result.goals);
        } else {
          throw new Error("API returned unsuccessful result");
        }
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error(
        "Failed to refresh via API, falling back to client-side:",
        error
      );
      // Fallback to client-side refresh
      await loadBlockchainData(true);
    } finally {
      setIsLoading(false);
    }
  }, [loadBlockchainData]);

  // Load blockchain data immediately for collective goals (public data)
  // Use force refresh on initial load to ensure fresh data
  useEffect(() => {
    if (!dataLoaded && !isLoading) {
      loadBlockchainData(true); // Force refresh on initial load
    }
  }, [dataLoaded, isLoading, loadBlockchainData]);

  // Show content when user is authenticated or has interacted
  useEffect(() => {
    if (isAuthenticated || hasInteracted) {
      setShowContent(true);
    }
  }, [isAuthenticated, hasInteracted]);

  // Refresh functionality removed

  // Handle network selection
  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
  };

  // Handle disconnect
  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
    }
    // Reset states
    setSelectedTab("goals");
    setShowContent(false);
    setShowOnboarding(true);
    setHasInteracted(false);
  };

  // Refresh functionality removed since components don't use it

  // Handle authentication state changes
  useEffect(() => {
    setLocalAuthError(authError);
  }, [authError]);

  // Hide onboarding after user interaction or successful auth
  useEffect(() => {
    if (isAuthenticated || hasInteracted) {
      setShowOnboarding(false);
      setShowContent(true);
    }
  }, [isAuthenticated, hasInteracted]);

  // Ensure content shows when wallet is connected (immediate effect)
  useEffect(() => {
    if (isConnected && !showContent) {
      console.log("Wallet connected, showing content immediately");
      setShowContent(true);
      setHasInteracted(true);
      setShowOnboarding(false);
      // Don't force tab changes - let users choose their own tabs
    }
  }, [isConnected, showContent]);

  // Remove automatic tab switching - users can freely choose any tab
  // The default tab is set to "goals" in useState, which is appropriate for all users

  return (
    <div className="retro-arcade min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* App Mode Indicator (development only) */}
        <AppModeIndicator />

        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="fixed top-2 right-2 z-50 bg-gray-800 p-2 rounded text-xs text-white">
            <div>Auth: {isAuthenticated ? "✓" : "✗"}</div>
            <div>Farcaster: {isFarcasterUser ? "✓" : "✗"}</div>
            <div>Wallet Only: {isWalletOnlyUser ? "✓" : "✗"}</div>
            <div>Show Content: {showContent ? "✓" : "✗"}</div>
            <div>Data Loaded: {dataLoaded ? "✓" : "✗"}</div>
            <div>Tab: {selectedTab}</div>
          </div>
        )}

        {/* Header with Arcade-Style Logo */}
        <header className="text-center mb-4 md:mb-6">
          <div className="game-container py-3 px-4 md:py-4 md:px-6 mb-4 bg-black relative">
            {/* Web App Only: Login Button for unauthenticated users who are browsing */}
            <WebAppOnly>
              {!showOnboarding && !isAuthenticated && !isLoading && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className="px-2 py-1 md:px-3 md:py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <span>🟣</span>
                    <span className="hidden md:inline">Sign In</span>
                  </button>
                </div>
              )}
            </WebAppOnly>

            <h1
              className="text-xl md:text-2xl mb-2 pulse-animation"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              IMPERFECT FORM
            </h1>

            <div className="flex justify-center space-x-1 md:space-x-2 mt-2">
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-celo"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-polygon"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-base-chain"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-monad"></span>
            </div>
          </div>

          {/* User Profile / Authentication */}
          <div className="mb-4 md:mb-6">
            {showOnboarding && !isAuthenticated && (
              <div className="space-y-4">
                {/* Main Hero Section */}
                <div className="game-container py-4 px-4 text-center bg-gradient-to-b from-gray-900 to-black border-2 border-white">
                  <div className="mb-4">
                    <h2 className="text-lg mb-3">
                      🎮 Cross-chain fitness tracking
                    </h2>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-lg mb-1">💪</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-lg mb-1">🏆</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-lg mb-1">🌐</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-lg mb-1">🎯</div>
                    </div>
                  </div>

                  {/* Context-aware CTA */}
                  <MiniAppOnly>
                    <button
                      onClick={() => {
                        setHasInteracted(true);
                        setShowAuthFlow(true);
                      }}
                      disabled={isAuthenticating}
                      className="retro-button px-6 py-3 w-full text-base"
                    >
                      🟣 Farcaster Sign In
                    </button>
                  </MiniAppOnly>

                  <WebAppOnly>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setHasInteracted(true);
                          setShowAuthFlow(true);
                        }}
                        disabled={isAuthenticating}
                        className="retro-button px-6 py-3 w-full text-base"
                      >
                        🟣 Farcaster Sign In
                      </button>
                      <button
                        onClick={() => {
                          setHasInteracted(true);
                          setShowAuthFlow(true);
                        }}
                        className="retro-button px-6 py-3 w-full text-base opacity-75"
                      >
                        Connect Wallet
                      </button>
                      <button
                        onClick={() => {
                          setHasInteracted(true);
                          setShowOnboarding(false);
                        }}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        Browse without connecting →
                      </button>
                    </div>
                  </WebAppOnly>
                </div>

                {/* Simplified Farcaster Upsell for Web Users */}
                <WebAppOnly>
                  <div className="game-container py-2 px-4 text-center bg-blue-900/20 border border-blue-600">
                    <p className="text-xs text-blue-200">
                      Farcaster unlocks: streaks, social features, sharing
                    </p>
                  </div>
                </WebAppOnly>
              </div>
            )}

            {isAuthenticated && currentUser ? (
              <div className="game-container py-2 px-3 md:py-3 md:px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {user?.pfp_url ? (
                      <Image
                        src={user.pfp_url}
                        alt="Profile"
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white flex-shrink-0"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-base md:text-lg">👤</span>
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {currentUser.display_name || "Connected User"}
                      </p>
                      {isFarcasterUser && user?.username && (
                        <p className="text-xs text-gray-400">
                          @{user.username}
                        </p>
                      )}
                      {/* Only show wallet address for wallet-only users in web app */}
                      <WebAppOnly>
                        {isWalletOnlyUser && address && (
                          <Web3Profile
                            address={address}
                            useUnifiedResolution={true}
                          />
                        )}
                      </WebAppOnly>
                    </div>
                  </div>

                  {/* Disconnect/Change Button - Only in web app */}
                  <WebAppOnly>
                    <div className="flex space-x-2">
                      {isWalletOnlyUser && (
                        <button
                          onClick={() => setShowAuthFlow(true)}
                          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          title="Connect different wallet"
                        >
                          Change
                        </button>
                      )}
                      <button
                        onClick={handleDisconnect}
                        className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        title={
                          isFarcasterUser ? "Sign out" : "Disconnect wallet"
                        }
                      >
                        {isFarcasterUser ? "Sign Out" : "Disconnect"}
                      </button>
                    </div>
                  </WebAppOnly>
                </div>
              </div>
            ) : null}

            {/* Auth Error Display */}
            {authError && (
              <div className="game-container py-2 px-3 bg-red-900/20 border border-red-600 text-red-300 text-sm">
                {authError}
              </div>
            )}

            {/* Auth Flow Modal */}
            {showAuthFlow && (
              <WebAppErrorBoundary>
                <AuthFlow
                  onAuthSuccess={() => setShowAuthFlow(false)}
                  onAuthError={(error) => setLocalAuthError(error)}
                />
              </WebAppErrorBoundary>
            )}
          </div>
        </header>

        {/* Main Content */}
        {(showContent || (!showOnboarding && !isAuthenticated)) && (
          <main className="space-y-4 md:space-y-6">
            {/* Navigation Tabs */}
            <WebAppNavigation
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              isFarcasterUser={isFarcasterUser}
              isWalletOnlyUser={isWalletOnlyUser}
            />

            {/* Mini App Navigation - Icon-only tabs for mobile */}
            <MiniAppOnly>
              <div className="mb-6">
                <div className="bg-gray-900 rounded-lg p-2">
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: "goals", label: "Goals", icon: "🎯" },
                      { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
                      { id: "networks", label: "Networks", icon: "🌐" },
                      { id: "predictions", label: "Predictions", icon: "🔮" },
                      { id: "stats", label: "Dashboard", icon: "📊" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as Tab)}
                        title={tab.label} // Show label on hover/long press
                        className={`
                          relative flex items-center justify-center p-4 rounded-lg transition-all
                          ${
                            selectedTab === tab.id
                              ? "bg-white text-black shadow-lg transform scale-105"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                          }
                        `}
                      >
                        <span className="text-xl">{tab.icon}</span>
                        {selectedTab === tab.id && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </MiniAppOnly>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {selectedTab === "stats" && showContent && (
                <PersonalDashboard
                  networkData={networkData}
                  isLoading={isLoading}
                />
              )}

              {selectedTab === "goals" && (
                <>
                  {goals ? (
                    <CollectiveGoalsComponent
                      goals={goals}
                      isLoading={isLoading}
                      onRefresh={refreshCollectiveGoals}
                    />
                  ) : (
                    <div className="game-container py-8 text-center">
                      <div className="text-lg mb-4">🎯 Collective Goals</div>
                      {isLoading ? (
                        <div className="text-sm text-gray-400">
                          Loading goals data...
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          Unable to load goals data. Please try refreshing the
                          page.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedTab === "networks" && showContent && (
                <div className="space-y-4">
                  <NetworkSelector
                    networks={Object.keys(networkData)}
                    selectedNetwork={selectedNetwork}
                    onSelectNetwork={handleNetworkSelect}
                  />
                  <NetworkContributions
                    data={networkData}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {selectedTab === "leaderboard" && showContent && (
                <Leaderboard
                  data={networkData}
                  selectedNetwork={selectedNetwork}
                  isLoading={isLoading}
                />
              )}

              {selectedTab === "predictions" && showContent && (
                <PredictionMarket />
              )}
            </div>
          </main>
        )}

        {/* Loading State */}
        {!showContent && !showOnboarding && (
          <div className="text-center py-12">
            <div className="game-container py-6 px-4">
              <div className="text-lg mb-4">🎮 Loading...</div>
              <div className="text-sm text-gray-400">
                Preparing your fitness dashboard
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
