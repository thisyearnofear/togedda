"use client";

import { useSignIn } from "@/hooks/use-sign-in";
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
  const { signIn, user, isSignedIn, error } = useSignIn({ autoSignIn: false });
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  // State variables
  const [selectedTab, setSelectedTab] = useState<Tab>("goals");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData>({});
  const [goals, setGoals] = useState<CollectiveGoals | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

  // Determine if user is authenticated (either Farcaster or wallet)
  const isAuthenticated = isSignedIn || isConnected;
  const isFarcasterUser = !!(isSignedIn && user?.fid);
  const isWalletOnlyUser = isConnected && !isFarcasterUser;
  const currentUser =
    user ||
    (isConnected ? { address, display_name: "Connected Wallet" } : null);

  // Lazy load blockchain data only when user interacts or is authenticated
  const loadBlockchainData = useCallback(async () => {
    if (dataLoaded || isLoading) return;

    setIsLoading(true);
    try {
      const data = await fetchAllNetworksData();
      setNetworkData(data);

      const calculatedGoals = calculateCollectiveGoals(data);
      if (calculatedGoals) {
        setGoals(calculatedGoals);
      }
      setDataLoaded(true);
    } catch (error) {
      console.error("Error fetching blockchain data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dataLoaded, isLoading]);

  // Only load data when user is authenticated or has interacted
  useEffect(() => {
    if (isAuthenticated || hasInteracted) {
      setShowContent(true);
      if (!dataLoaded) {
        loadBlockchainData();
      }
    }
  }, [isAuthenticated, hasInteracted, dataLoaded, loadBlockchainData]);

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
    setAuthError(error);
  }, [error]);

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
      // Default wallet users to a more meaningful tab
      if (!isFarcasterUser) {
        setSelectedTab("goals");
      }
    }
  }, [isConnected, showContent, isFarcasterUser]);

  // Set appropriate default tab based on user type
  useEffect(() => {
    if (isFarcasterUser && selectedTab === "goals") {
      setSelectedTab("stats"); // Farcaster users get full stats dashboard
    } else if (isWalletOnlyUser && selectedTab === "stats") {
      setSelectedTab("goals"); // Wallet users start with collective goals
    }
  }, [isFarcasterUser, isWalletOnlyUser, selectedTab]);

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
          <div className="game-container py-3 px-4 md:py-4 md:px-6 mb-4 bg-black">
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

            <div className="text-xs text-gray-400 mt-2">
              Cross-chain fitness tracking
            </div>
          </div>

          {/* User Profile / Authentication */}
          <div className="mb-4 md:mb-6">
            {showOnboarding && !isAuthenticated && (
              <div className="space-y-4">
                {/* Main Hero Section */}
                <div className="game-container py-4 px-4 md:py-6 md:px-6 text-center bg-gradient-to-b from-gray-900 to-black border-2 border-white">
                  <div className="mb-4">
                    <h2 className="text-lg md:text-xl mb-2 md:mb-3">
                      🎮 Welcome to Imperfect Form!
                    </h2>
                    <p className="text-sm text-gray-300 mb-3 md:mb-4">
                      Track workouts, compete with friends, and earn rewards
                      across multiple blockchain networks.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 text-xs">
                    <div className="bg-gray-800 p-2 md:p-3 rounded">
                      <div className="text-base md:text-lg mb-1">💪</div>
                      <div className="text-xs">Track Workouts</div>
                    </div>
                    <div className="bg-gray-800 p-2 md:p-3 rounded">
                      <div className="text-base md:text-lg mb-1">🏆</div>
                      <div className="text-xs">Compete</div>
                    </div>
                    <div className="bg-gray-800 p-2 md:p-3 rounded">
                      <div className="text-base md:text-lg mb-1">🌐</div>
                      <div className="text-xs">Multi-Chain</div>
                    </div>
                    <div className="bg-gray-800 p-2 md:p-3 rounded">
                      <div className="text-base md:text-lg mb-1">🎯</div>
                      <div className="text-xs">Earn Rewards</div>
                    </div>
                  </div>

                  {/* Context-aware CTA */}
                  <MiniAppOnly>
                    <button
                      onClick={() => {
                        setHasInteracted(true);
                        setIsAuthenticating(true);
                        signIn().catch((error) => {
                          setIsAuthenticating(false);
                          setAuthError(error?.message || "Sign-in failed");
                        });
                      }}
                      disabled={isAuthenticating}
                      className="retro-button px-6 py-3 w-full text-base md:text-lg mb-3"
                    >
                      🟣 Sign in with Farcaster
                    </button>
                  </MiniAppOnly>

                  <WebAppOnly>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setHasInteracted(true);
                          setIsAuthenticating(true);
                          signIn().catch((error) => {
                            setIsAuthenticating(false);
                            setAuthError(
                              error?.message ||
                                "Farcaster sign-in failed. Try wallet connection below."
                            );
                          });
                        }}
                        disabled={isAuthenticating}
                        className="retro-button px-6 py-3 w-full text-base md:text-lg"
                      >
                        🟣 Sign in with Farcaster
                      </button>
                      <button
                        onClick={() => {
                          setHasInteracted(true);
                          setShowAuthFlow(true);
                        }}
                        className="retro-button px-6 py-3 w-full text-base md:text-lg opacity-75"
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

                {/* Farcaster Upsell for Web Users */}
                <WebAppOnly>
                  <div className="game-container py-3 px-4 text-center bg-blue-900/20 border border-blue-600">
                    <div className="text-blue-300 text-sm font-bold mb-2">
                      💡 Why Farcaster?
                    </div>
                    <p className="text-xs text-blue-200 mb-3">
                      Farcaster sign-in unlocks: streak tracking, social
                      features, cross-chain identity, and sharing
                    </p>
                    <div className="text-xs text-gray-400">
                      Wallet connection gives basic stats only
                    </div>
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
                      {isWalletOnlyUser && address && (
                        <Web3Profile
                          address={address}
                          useUnifiedResolution={true}
                        />
                      )}
                    </div>
                  </div>

                  {/* Disconnect/Change Button */}
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
                  onAuthError={(error) => setAuthError(error)}
                />
              </WebAppErrorBoundary>
            )}
          </div>
        </header>

        {/* Main Content */}
        {showContent && (
          <main className="space-y-4 md:space-y-6">
            {/* Navigation Tabs */}
            <WebAppNavigation
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              isFarcasterUser={isFarcasterUser}
              isWalletOnlyUser={isWalletOnlyUser}
            />

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {selectedTab === "stats" && (
                <PersonalDashboard
                  networkData={networkData}
                  isLoading={isLoading}
                />
              )}

              {selectedTab === "goals" && goals && (
                <CollectiveGoalsComponent goals={goals} isLoading={isLoading} />
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

              {selectedTab === "predictions" && <PredictionMarket />}
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
