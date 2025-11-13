"use client";

import {
  useUnifiedApp,
  useAppUser,
  useAppEnvironment,
} from "@/contexts/unified-app-context";
import {
  NetworkData,
  fetchAllNetworksData,
  calculateCollectiveGoals,
  CollectiveGoals,
} from "@/lib/blockchain";
import Web3Profile from "@/components/Web3Profile";
import AuthFlow from "@/components/AuthFlow";
import EnhancedUserStatus from "@/components/EnhancedUserStatus";
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

// Simple conditional rendering components
const MiniAppOnly = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useAppEnvironment();
  return mode === "miniapp" ? <>{children}</> : null;
};

const WebAppOnly = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useAppEnvironment();
  return mode === "webapp" ? <>{children}</> : null;
};

const AppModeIndicator = () => {
  const { mode, isFarcasterEnvironment } = useAppEnvironment();

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed top-2 left-2 z-50 bg-gray-800 p-2 rounded text-xs text-white">
      <div>Mode: {mode}</div>
      <div>Farcaster: {isFarcasterEnvironment ? "✓" : "✗"}</div>
    </div>
  );
};

export default function Home() {
  const {
    user,
    isAuthenticated,
    isFarcasterUser,
    isWalletUser: isWalletOnlyUser,
    isLoading: authLoading,
  } = useAppUser();
  const { mode, showMiniAppFeatures, showWebAppFeatures } = useAppEnvironment();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  // State variables
  const [selectedTab, setSelectedTabInternal] = useState<Tab>("goals");

  // Wrap setSelectedTab for potential debugging
  const setSelectedTab = useCallback((tab: Tab) => {
    setSelectedTabInternal(tab);
  }, []);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localAuthError, setLocalAuthError] = useState<string | null>(null);
  const authError = null; // No longer needed with simplified auth
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData>({});
  const [goals, setGoals] = useState<CollectiveGoals | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

  // Use the unified auth user as current user
  const currentUser = user;

  // Lazy load blockchain data only when user interacts or is authenticated
  const loadBlockchainData = useCallback(
    async (forceRefresh = false) => {
      console.log("loadBlockchainData called", { forceRefresh, dataLoaded, isLoading });
      if (!forceRefresh && (dataLoaded || isLoading)) {
        console.log("Early return from loadBlockchainData");
        return;
      }

      const callId = Math.random().toString(36).substring(7);
      console.log(`🔴 LOAD BLOCKCHAIN DATA START [${callId}]`, { forceRefresh, dataLoaded, isLoading });
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
        console.log(`🟢 LOAD BLOCKCHAIN DATA END [${callId}]`);
      }
    },
    [] // Remove dependencies that cause infinite loops
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
    const effectId = Math.random().toString(36).substring(7);
    console.log(`🔵 USEEFFECT TRIGGERED [${effectId}]`, { dataLoaded, isLoading });
    if (!dataLoaded && !isLoading) {
      console.log(`🔵 CALLING loadBlockchainData from useEffect [${effectId}]`);
      loadBlockchainData(true); // Force refresh on initial load
    } else {
      console.log(`🔵 SKIPPING loadBlockchainData [${effectId}]`, { dataLoaded, isLoading });
    }
  }, [dataLoaded, isLoading]); // Remove loadBlockchainData dependency to prevent infinite loop

  // Handle network selection
  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
  };

  // Handle disconnect and close auth flow
  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
    }
    setShowAuthFlow(false);
    setSelectedTab("goals");
  };

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
            <div>Data Loaded: {dataLoaded ? "✓" : "✗"}</div>
            <div>Tab: {selectedTab}</div>
          </div>
        )}

        {/* Header with Arcade-Style Logo */}
        <header className="text-center mb-4 md:mb-6">
          <div className="game-container py-3 px-4 md:py-4 md:px-6 mb-4 bg-black relative">
            <h1
              className="text-xl md:text-2xl mb-2 pulse-animation"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              TOGEDDA
            </h1>

            <div className="flex justify-center space-x-1 md:space-x-2 mt-2">
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-celo"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-polygon"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-base-chain"></span>
              <span className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-monad"></span>
            </div>
          </div>

          {/* User Profile / Authentication - Always visible */}
          <div className="mb-4 md:mb-6">
            {!isAuthenticated && (
              <WebAppOnly>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Sign In
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Farcaster unlocks: streaks, social features, sharing
                  </p>
                </div>
              </WebAppOnly>
            )}

            {isAuthenticated && currentUser ? (
              <div className="game-container py-2 px-3 md:py-3 md:px-4">
                <EnhancedUserStatus
                  user={currentUser}
                  onDisconnect={handleDisconnect}
                  compact={false}
                  showWalletControls={true}
                />
              </div>
            ) : null}

            {/* Auth Error Display */}
            {localAuthError && (
              <div className="game-container py-2 px-3 bg-red-900/20 border border-red-600 text-red-300 text-sm">
                {localAuthError}
              </div>
            )}

            {/* Auth Flow Modal - Overlay with backdrop */}
            {showAuthFlow && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-black border-2 border-white rounded-lg p-6 max-w-sm w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Sign In</h2>
                    <button
                      onClick={() => setShowAuthFlow(false)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <WebAppErrorBoundary>
                    <AuthFlow
                      onAuthSuccess={() => setShowAuthFlow(false)}
                      onAuthError={(error) => setLocalAuthError(error)}
                    />
                  </WebAppErrorBoundary>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content - Always visible */}
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
              {selectedTab === "stats" && (
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

              {selectedTab === "networks" && (
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

              {selectedTab === "leaderboard" && (
                <Leaderboard
                  data={networkData}
                  selectedNetwork={selectedNetwork}
                  isLoading={isLoading}
                />
              )}

              {selectedTab === "predictions" && (
                <PredictionMarket />
              )}
            </div>
        </main>
      </div>
    </div>
  );
}
