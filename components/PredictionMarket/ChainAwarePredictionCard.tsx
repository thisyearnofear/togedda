"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
} from "wagmi";
import { toast } from "react-hot-toast";
import {
  FaArrowUp,
  FaArrowDown,
  FaShare,
  FaFireAlt,
  FaWallet,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { useAppUser, useAppEnvironment } from "@/contexts/unified-app-context";
import {
  Prediction,
  PredictionStatus,
  PredictionOutcome,
  calculateOdds,
  getUserVote,
  getFeeInfo,
  type FeeInfo,
} from "@/lib/prediction-market-v2";
import { formatDistanceToNow } from "date-fns";
import { env } from "@/lib/env";
import Confetti from "@/components/Confetti";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { predictionMarketABI } from "@/lib/constants";
import {
  CHAIN_CONFIG,
  type SupportedChain,
  getStakingRecommendations,
} from "@/lib/dual-chain-service";

interface ChainAwarePredictionCardProps {
  prediction: Prediction;
  onVote: (
    predictionId: number,
    isYes: boolean,
    amount: string
  ) => Promise<void>;
  simplified?: boolean;
  chain?: SupportedChain; // Add chain information
}

const ChainAwarePredictionCard: React.FC<ChainAwarePredictionCardProps> = ({
  prediction,
  onVote,
  simplified = false,
  chain,
}) => {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { context } = useMiniKit();
  const { user, isFarcasterUser } = useAppUser();
  const { isFarcasterEnvironment } = useAppEnvironment();
  const [isVoting, setIsVoting] = useState(false);
  const [amount, setAmount] = useState("0.1");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [userVote, setUserVote] = useState<{
    isYes: boolean;
    amount: number;
    claimed: boolean;
  } | null>(null);
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);

  // Determine chain from prediction network or use provided chain
  const detectedChain: SupportedChain =
    chain ||
    (prediction.network.toLowerCase().includes("celo") ? "celo" : "base");

  const chainConfig = CHAIN_CONFIG[detectedChain];
  const stakingRecs = getStakingRecommendations(detectedChain);

  // Chain-specific styling
  const chainColors = {
    celo: {
      border: "border-yellow-400",
      bg: "bg-yellow-900",
      text: "text-yellow-400",
      accent: "text-yellow-300",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
    base: {
      border: "border-blue-400",
      bg: "bg-blue-900",
      text: "text-blue-400",
      accent: "text-blue-300",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const colors = chainColors[detectedChain];

  useEffect(() => {
    // Set default amount based on chain recommendations
    setAmount(stakingRecs.recommendedAmounts[0]);
  }, [detectedChain, stakingRecs.recommendedAmounts]);

  useEffect(() => {
    const loadUserVote = async () => {
      if (address) {
        try {
          const vote = await getUserVote(prediction.id, address);
          setUserVote(vote);
        } catch (error) {
          console.error("Error loading user vote:", error);
        }
      }
    };

    const loadFeeInfo = async () => {
      try {
        const info = await getFeeInfo();
        setFeeInfo(info);
      } catch (error) {
        console.error("Error loading fee info:", error);
      }
    };

    loadUserVote();
    loadFeeInfo();
  }, [prediction.id, address]);

  const odds = calculateOdds(prediction.yesVotes, prediction.noVotes);
  const isActive = prediction.status === PredictionStatus.ACTIVE;
  const timeLeft = formatDistanceToNow(new Date(prediction.targetDate * 1000), {
    addSuffix: true,
  });

  const handleVote = async (isYes: boolean) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsVoting(true);
    try {
      await onVote(prediction.id, isYes, amount);
      setShowSharePrompt(true);

      // Reload user vote after successful vote
      if (address) {
        const vote = await getUserVote(prediction.id, address);
        setUserVote(vote);
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleConnectWallet = async (connectorId: string) => {
    try {
      const connector = connectors.find((c) => c.id === connectorId);
      if (connector) {
        await connect({ connector });
        setShowWalletOptions(false);
        toast.success("Wallet connected!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const handleShare = async () => {
    try {
      // Import the SDK dynamically to avoid SSR issues
      const { sdk } = await import("@farcaster/frame-sdk");

      const shareText = `I just ${
        userVote?.isYes ? "backed YES" : "backed NO"
      } on "${prediction.title}" with ${userVote?.amount.toFixed(2)} ${
        chainConfig.nativeCurrency.symbol
      } on ${chainConfig.name}!

${
  detectedChain === "celo"
    ? "🏆 Supporting Greenpill Kenya charity"
    : "🛠️ Building on Base Sepolia"
}

Check it out: ${env.NEXT_PUBLIC_URL}`;

      // Share to Farcaster using composeCast
      await sdk.actions.composeCast({
        text: shareText,
        embeds: [`${env.NEXT_PUBLIC_URL}/predictions/${prediction.id}`],
      });

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast.success("Shared to Farcaster!");
      setShowSharePrompt(false);
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      // Fallback to clipboard if sharing fails
      try {
        const shareText = `I just ${
          userVote?.isYes ? "backed YES" : "backed NO"
        } on "${prediction.title}" with ${userVote?.amount.toFixed(2)} ${
          chainConfig.nativeCurrency.symbol
        } on ${chainConfig.name}!`;

        await navigator.clipboard.writeText(shareText);
        toast.success("Copied to clipboard!");
      } catch (clipboardError) {
        toast.error("Failed to share. Please try again.");
      }
    }
  };

  // Simplified version for the network cards
  if (simplified) {
    return (
      <div className="relative">
        <Confetti active={showConfetti} />

        {showSharePrompt && userVote && (
          <div
            className={`absolute top-0 right-0 left-0 ${colors.button} text-white p-2 rounded-t-lg flex items-center justify-between z-10`}
          >
            <div className="flex items-center">
              <FaFireAlt className="mr-2 animate-pulse" />
              <span className="text-xs">Share!</span>
            </div>
            <button
              onClick={handleShare}
              className="bg-white text-black px-2 py-1 rounded text-xs font-bold"
            >
              Share
            </button>
          </div>
        )}

        {/* Chain indicator with resolution info */}
        <div
          className={`flex items-center justify-between mb-2 p-2 ${colors.bg} bg-opacity-20 border ${colors.border} rounded`}
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">{chainConfig.emoji}</span>
            <div>
              <span className={`text-xs font-medium ${colors.text}`}>
                {chainConfig.name}
              </span>
              <div className={`text-xs ${colors.accent}`}>
                Resolves {timeLeft}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {prediction.autoResolvable && (
              <span
                className={`text-xs ${colors.text} bg-opacity-50 ${colors.bg} px-1 rounded`}
              >
                Auto-resolve
              </span>
            )}
            <a
              href={`${chainConfig.blockExplorer}/address/${chainConfig.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${colors.accent} hover:${colors.text}`}
              title="View contract on explorer"
            >
              <FaExternalLinkAlt />
            </a>
          </div>
        </div>

        <h2 className="text-base font-bold mb-3">{prediction.title}</h2>

        <div className="flex justify-between mb-3">
          <div className="text-center">
            <p className="text-sm text-gray-400">YES</p>
            <p className="text-lg font-bold">{odds.yes}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">NO</p>
            <p className="text-lg font-bold">{odds.no}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-lg font-bold">
              {prediction.totalStaked.toFixed(1)}{" "}
              {chainConfig.nativeCurrency.symbol}
            </p>
          </div>
        </div>

        {/* Staking recommendations */}
        <div
          className={`${colors.bg} bg-opacity-10 border ${colors.border} rounded p-2 mb-3`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs ${colors.text} font-medium`}>
              Recommended stakes:
            </span>
            <span className={`text-xs ${colors.accent}`}>
              {stakingRecs.note}
            </span>
          </div>
          <div className="flex space-x-1">
            {stakingRecs.recommendedAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`text-xs px-2 py-1 rounded border ${colors.border} ${
                  amount === amt
                    ? `${colors.bg} bg-opacity-50 ${colors.text}`
                    : `hover:${colors.bg} hover:bg-opacity-30 ${colors.accent}`
                }`}
              >
                {amt} {chainConfig.nativeCurrency.symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center disabled:opacity-50"
          >
            <FaArrowUp className="mr-1" /> YES
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center disabled:opacity-50"
          >
            <FaArrowDown className="mr-1" /> NO
          </button>
        </div>

        {userVote && (
          <div className="mt-2">
            <button
              onClick={handleShare}
              className={`w-full ${colors.button} text-white px-2 py-1 rounded text-sm flex items-center justify-center animate-pulse`}
            >
              <FaShare className="mr-1" /> Share Position
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full version would continue here...
  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 mb-4 shadow-lg relative">
      {/* Full version implementation would go here */}
      <p className="text-gray-400">Full version coming soon...</p>
    </div>
  );
};

export default ChainAwarePredictionCard;
