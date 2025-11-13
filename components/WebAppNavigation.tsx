"use client";

import { useState, useEffect } from "react";
import { useAppEnvironment, useAppUser } from "@/contexts/unified-app-context";
import { useWebAppInstall } from "@/components/WebAppInstallPrompt";
import AuthFlow from "@/components/AuthFlow";

// Simple conditional rendering component
const WebAppOnly = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useAppEnvironment();
  return mode === "webapp" ? <>{children}</> : null;
};

import type { Tab } from "@/src/types";

interface WebAppNavigationProps {
  selectedTab: Tab;
  onTabChange: (tab: Tab) => void;
  isWalletOnlyUser?: boolean;
  isFarcasterUser?: boolean;
}

export default function WebAppNavigation({
  selectedTab,
  onTabChange,
  isWalletOnlyUser = false,
  isFarcasterUser = false,
}: WebAppNavigationProps) {
  const { mode, isStandalone } = useAppEnvironment();
  const { isInstallable, installApp } = useWebAppInstall();
  const {
    isFarcasterUser: unifiedIsFarcasterUser,
    isWalletUser: unifiedIsWalletOnlyUser,
    isLoading: authLoading,
  } = useAppUser();
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  // Use unified auth state instead of props (props are for backward compatibility)
  const actualIsFarcasterUser = unifiedIsFarcasterUser || isFarcasterUser;
  const actualIsWalletOnlyUser = unifiedIsWalletOnlyUser || isWalletOnlyUser;

  useEffect(() => {
    // Show install button in web app mode if installable and not standalone
    setShowInstallButton(mode === "webapp" && isInstallable && !isStandalone);
  }, [mode, isInstallable, isStandalone]);

  const tabs: {
    id: Tab;
    label: string;
    icon: string;
    disabled?: boolean;
    tooltip?: string;
  }[] = [
    { id: "goals", label: "Goals", icon: "🎯" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { id: "networks", label: "Networks", icon: "🌐" },
    { id: "predictions", label: "Predictions", icon: "🔮" },
    {
      id: "stats",
      label: actualIsFarcasterUser ? "Dashboard" : "Stats",
      icon: "📊",
      disabled: actualIsWalletOnlyUser,
      tooltip: actualIsWalletOnlyUser
        ? "Connect with Farcaster for full personal dashboard"
        : "",
    },
  ];

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      setShowInstallButton(false);
    }
  };

  const handleFarcasterSignIn = () => {
    setShowAuthFlow(true);
  };

  return (
    <WebAppOnly>
      <div className="mb-6">
        {/* Enhanced web app header */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-900 rounded-lg">
          <div></div>
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">IF</span>
              </div>
              <h2 className="text-sm font-bold">Togedda</h2>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">IC</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">Sports Predictions</p>
          </div>

          {/* Install button for web app */}
          {showInstallButton ? (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
            >
              <span>📱</span>
              <span>Install</span>
            </button>
          ) : (
            <div></div>
          )}
        </div>

        {/* Enhanced tab navigation for web app */}
        <div className="bg-gray-900 rounded-lg p-2">
          <div className="grid grid-cols-5 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                title={tab.tooltip}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-lg transition-all
                  ${
                    selectedTab === tab.id
                      ? "bg-white text-black shadow-lg transform scale-105"
                      : tab.disabled
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
              >
                <span className="text-lg mb-1">{tab.icon}</span>
                <span className="text-xs font-medium truncate w-full text-center">
                  {tab.label}
                </span>

                {/* Active indicator */}
                {selectedTab === tab.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}

                {/* Disabled overlay */}
                {tab.disabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs bg-gray-700 px-1 rounded">🔒</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Web app specific features info */}
        <div className="mt-3 text-center">
          <div className="inline-flex items-center space-x-4 text-xs text-gray-500">
            {isStandalone && (
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Installed App</span>
              </div>
            )}
            {!isStandalone && (
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Web Version</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <span>🌐</span>
              <span>Cross-platform</span>
            </div>
          </div>
        </div>

        {/* Feature comparison for wallet users */}
        {actualIsWalletOnlyUser && !actualIsFarcasterUser && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="text-center">
              <h3 className="text-sm font-bold text-blue-300 mb-2">
                🚀 Unlock Full Features with Farcaster
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-medium text-blue-200">
                    With Farcaster:
                  </div>
                  <div className="text-blue-300">✅ Personal dashboard</div>
                  <div className="text-blue-300">✅ Streak tracking</div>
                  <div className="text-blue-300">✅ Social features</div>
                  <div className="text-blue-300">✅ Cross-chain identity</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-gray-300">Wallet Only:</div>
                  <div className="text-gray-400">📊 Basic stats</div>
                  <div className="text-gray-400">🔍 View leaderboards</div>
                  <div className="text-gray-400">🌐 Network data</div>
                  <div className="text-gray-400">🔮 Predictions</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleFarcasterSignIn}
                  disabled={authLoading}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {authLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>🟣</span>
                      <span>Sign in with Farcaster</span>
                    </>
                  )}
                </button>
                {/* Only show Farcaster signup link in web app context */}
                <div className="text-center">
                  <a
                    href="https://www.farcaster.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-300 underline"
                  >
                    Don&apos;t have Farcaster? Get it here →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Flow Modal */}
        {showAuthFlow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Connect Account</h3>
                <button
                  onClick={() => setShowAuthFlow(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <AuthFlow
                onAuthSuccess={() => setShowAuthFlow(false)}
                onAuthError={(error) => console.error("Auth error:", error)}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>
    </WebAppOnly>
  );
}
