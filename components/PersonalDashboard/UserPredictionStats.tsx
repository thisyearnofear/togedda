"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useUserVotes } from "@/hooks/use-prediction-queries";
import { useAppUser, useAppEnvironment } from "@/contexts/unified-app-context";
import { CHAIN_CONFIG, type SupportedChain } from "@/lib/dual-chain-service";
import { formatDistanceToNow } from "date-fns";
import {
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaTrophy,
  FaCoins,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

// Define the UserVote interface to match the API response
interface UserVote {
  predictionId: number;
  predictionTitle: string;
  chain: string;
  isYes: boolean;
  amount: number;
  timestamp: number;
  status: "active" | "resolved" | "expired";
  outcome?: "yes" | "no" | "unresolved";
  claimed: boolean;
  potentialReward?: number;
}

interface UserPredictionStatsProps {
  isNewUser?: boolean;
}

const UserPredictionStats: React.FC<UserPredictionStatsProps> = ({
  isNewUser = false,
}) => {
  const { address } = useAccount();
  const { user, isFarcasterUser } = useAppUser();
  const { isFarcasterEnvironment } = useAppEnvironment();
  const { data: userVotesData, isLoading } = useUserVotes();
  const [showAllVotes, setShowAllVotes] = useState(false);

  // Determine if user has any way to access prediction data
  const hasWalletAccess = !!address;
  const hasFarcasterAddresses = isFarcasterUser && user?.custody_address;

  // In Farcaster mini app environment, MiniKit should handle wallet connection automatically
  // In web app environment, users need to manually connect wallet
  const canAccessPredictions =
    hasWalletAccess ||
    (isFarcasterEnvironment && isFarcasterUser) || // MiniKit handles wallet in mini app
    hasFarcasterAddresses;

  // Only show wallet connection prompt in web app environment
  const shouldShowWalletPrompt =
    !canAccessPredictions && isFarcasterUser && !isFarcasterEnvironment; // Only in web app, not mini app

  // Chain-specific styling
  const chainColors = {
    celo: {
      bg: "bg-yellow-900",
      border: "border-yellow-400",
      text: "text-yellow-400",
      accent: "text-yellow-300",
    },
    base: {
      bg: "bg-blue-900",
      border: "border-blue-400",
      text: "text-blue-400",
      accent: "text-blue-300",
    },
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="loading-spinner mx-auto"></div>
        <p className="text-xs text-gray-400 mt-2">
          Loading your predictions...
        </p>
      </div>
    );
  }

  const votes = userVotesData?.votes || [];
  const summary = userVotesData?.summary || {
    totalVotes: 0,
    totalStaked: 0,
    activeVotes: 0,
    resolvedVotes: 0,
    winningVotes: 0,
    totalRewards: 0,
    unclaimedRewards: 0,
  };

  // If no votes and new user, show onboarding
  if (votes.length === 0 || isNewUser) {
    return (
      <div className="text-center">
        <div className="flex justify-between mb-4">
          <div className="text-center flex-1">
            <div className="text-blue-500 text-xl sm:text-2xl mb-1">0</div>
            <div className="text-xs">Total</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-green-500 text-xl sm:text-2xl mb-1">0</div>
            <div className="text-xs">Correct</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-yellow-500 text-xl sm:text-2xl mb-1">0</div>
            <div className="text-xs">Pending</div>
          </div>
        </div>

        <div className="text-xs mb-4 border-t border-gray-700 pt-4">
          {/* Show different content based on environment and wallet connection status */}
          {shouldShowWalletPrompt ? (
            <div className="mb-4 p-3 border border-orange-400 rounded-lg bg-orange-900 bg-opacity-20">
              <div className="flex items-center mb-2">
                <span className="text-orange-400 text-lg mr-2">🔗</span>
                <span className="text-orange-400 text-sm font-bold">
                  Connect Wallet
                </span>
              </div>
              <p className="text-orange-300 text-xs mb-2">
                Connect a wallet to track your prediction stakes
              </p>
              <p className="text-xs text-orange-200">
                Your Farcaster verified addresses will be checked automatically
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* CELO Onboarding */}
              <div className="border-2 border-yellow-400 p-3 rounded-lg bg-yellow-900 bg-opacity-20">
                <div className="flex items-center mb-2">
                  <span className="text-yellow-400 text-lg mr-2">🟡</span>
                  <span className="text-yellow-400 text-sm font-bold">
                    CELO Mainnet
                  </span>
                </div>
                <p className="text-yellow-300 text-xs mb-2">
                  Real stakes, real charity impact
                </p>
                <p className="text-xs text-yellow-200">
                  15% of stakes → Greenpill Kenya
                </p>
              </div>

              {/* Base Onboarding */}
              <div className="border-2 border-blue-400 p-3 rounded-lg bg-blue-900 bg-opacity-20">
                <div className="flex items-center mb-2">
                  <span className="text-blue-400 text-lg mr-2">🔵</span>
                  <span className="text-blue-400 text-sm font-bold">
                    Base Sepolia
                  </span>
                </div>
                <p className="text-blue-300 text-xs mb-2">
                  Build, experiment, learn together
                </p>
                <p className="text-xs text-blue-200">
                  Free testnet ETH for experimentation
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-2">
            {canAccessPredictions ? (
              <>
                Stake on fitness challenges in the{" "}
                <span className="text-purple-400">Predictions</span> tab
              </>
            ) : shouldShowWalletPrompt ? (
              <>Connect wallet to start staking on predictions</>
            ) : isFarcasterEnvironment ? (
              <>
                MiniKit wallet integration loading...{" "}
                <span className="text-purple-400">Predictions</span> coming soon
              </>
            ) : (
              <>
                Stake on fitness challenges in the{" "}
                <span className="text-purple-400">Predictions</span> tab
              </>
            )}
          </p>
        </div>

        <div className="text-xs text-gray-300 mb-2">
          &ldquo;Health + wellness = good times.&rdquo;
        </div>
        <div className="text-xs text-purple-400 pulse-animation">
          Do well for you, do good for others
        </div>
      </div>
    );
  }

  // Show actual prediction stats
  const displayVotes = showAllVotes ? votes : votes.slice(0, 3);
  const hasMore = votes.length > 3;

  return (
    <div>
      {/* Summary Stats */}
      <div className="flex justify-between mb-4">
        <div className="text-center flex-1">
          <div className="text-blue-500 text-xl sm:text-2xl mb-1">
            {summary.totalVotes}
          </div>
          <div className="text-xs">Total</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-green-500 text-xl sm:text-2xl mb-1">
            {summary.winningVotes}
          </div>
          <div className="text-xs">Correct</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-yellow-500 text-xl sm:text-2xl mb-1">
            {summary.activeVotes}
          </div>
          <div className="text-xs">Pending</div>
        </div>
      </div>

      {/* Total Staked */}
      <div className="text-center mb-4 border-t border-gray-700 pt-4">
        <div className="text-xs mb-1">Total Staked</div>
        <div className="text-purple-400 text-xl">
          {summary.totalStaked.toFixed(3)}
          <span className="text-sm text-gray-400 ml-1">CELO/ETH</span>
        </div>
        {summary.unclaimedRewards > 0 && (
          <div className="text-xs text-green-400 mt-1">
            {summary.unclaimedRewards.toFixed(3)} unclaimed rewards
          </div>
        )}
      </div>

      {/* Recent Predictions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-300">
            Recent Predictions
          </h4>
          {hasMore && (
            <button
              onClick={() => setShowAllVotes(!showAllVotes)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center"
            >
              {showAllVotes ? (
                <>
                  <FaChevronUp className="mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <FaChevronDown className="mr-1" />+{votes.length - 3} more
                </>
              )}
            </button>
          )}
        </div>

        {displayVotes.map((vote: UserVote, index: number) => {
          const chain = vote.chain as SupportedChain;
          const chainConfig = CHAIN_CONFIG[chain];
          const colors = chainColors[chain] || chainColors.celo;

          const timeLeft =
            vote.status === "active"
              ? `Ends ${formatDistanceToNow(
                  new Date(vote.timestamp + 30 * 24 * 60 * 60 * 1000),
                  { addSuffix: true }
                )}`
              : vote.status === "resolved"
              ? "Resolved"
              : "Expired";

          return (
            <div
              key={`${vote.predictionId}-${index}`}
              className={`border ${colors.border} rounded-lg p-3 ${colors.bg} bg-opacity-20`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h5
                    className="text-sm font-medium truncate"
                    title={vote.predictionTitle}
                  >
                    {vote.predictionTitle}
                  </h5>
                  <div className="flex items-center mt-1">
                    <span className="text-lg mr-2">{chainConfig.emoji}</span>
                    <span className={`text-xs ${colors.text}`}>
                      {chainConfig.name}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div
                    className={`flex items-center ${
                      vote.isYes ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {vote.isYes ? (
                      <FaArrowUp className="mr-1" />
                    ) : (
                      <FaArrowDown className="mr-1" />
                    )}
                    <span className="text-xs font-bold">
                      {vote.isYes ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className={`text-xs ${colors.accent}`}>
                    {vote.amount.toFixed(3)} {chainConfig.nativeCurrency.symbol}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaClock className="text-gray-400 mr-1 text-xs" />
                  <span className="text-xs text-gray-400">{timeLeft}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {vote.status === "resolved" && (
                    <div className="flex items-center">
                      {vote.potentialReward && vote.potentialReward > 0 ? (
                        <div className="flex items-center text-green-400">
                          <FaTrophy className="mr-1 text-xs" />
                          <span className="text-xs">
                            +{vote.potentialReward.toFixed(3)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No reward</span>
                      )}
                    </div>
                  )}

                  <a
                    href={`${chainConfig.blockExplorer}/address/${chainConfig.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs ${colors.accent} hover:${colors.text}`}
                    title="View on explorer"
                  >
                    <FaExternalLinkAlt />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call to Action */}
      {votes.length > 0 && (
        <div className="text-center mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">
            Keep predicting to earn more rewards!
          </p>
          <div className="text-xs text-purple-400">
            🎯 Accuracy builds reputation
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPredictionStats;
