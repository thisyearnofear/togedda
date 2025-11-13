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
  type FeeInfo,
} from "@/lib/prediction-market-v2";
import { useChainContracts } from "@/hooks/use-chain-contracts";
import { formatDistanceToNow } from "date-fns";
import { env } from "@/lib/env";
import Confetti from "@/components/Confetti";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { predictionMarketABI } from "@/lib/constants";
import TransactionSuccessModal from "./TransactionSuccessModal";
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
  chain?: SupportedChain;
  compact?: boolean; // New compact mode
  expanded?: boolean; // Whether card is expanded
  onToggleExpand?: () => void; // Toggle expansion
}

const ChainAwarePredictionCard: React.FC<ChainAwarePredictionCardProps> = ({
  prediction,
  onVote,
  simplified = false,
  chain,
  compact = false,
  expanded = false,
  onToggleExpand,
}) => {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { context } = useMiniKit();
  const { user, isFarcasterUser } = useAppUser();
  const { isFarcasterEnvironment } = useAppEnvironment();
  const { getUserVote, getFeeInfo } = useChainContracts();
  const [isVoting, setIsVoting] = useState(false);
  const [amount, setAmount] = useState("0.1");

  // Debug amount changes
  useEffect(() => {
    console.log(`💰 Amount state changed to: ${amount}`);
  }, [amount]);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    type: "stake" | "claim" | "prediction";
    hash: string;
    amount?: string;
  }>({ type: "stake", hash: "", amount: "" });
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
    bsc: {
      border: "border-orange-400",
      bg: "bg-orange-900",
      text: "text-orange-400",
      accent: "text-orange-300",
      button: "bg-orange-600 hover:bg-orange-700",
    },
  };

  const colors = chainColors[detectedChain];

  useEffect(() => {
    // Set default amount based on chain recommendations only if amount is not already set
    if (!amount || amount === "0.1") {
      setAmount(stakingRecs.recommendedAmounts[0]);
    }
  }, [detectedChain, stakingRecs.recommendedAmounts, amount]); // Include 'amount' to satisfy ESLint

  useEffect(() => {
    const loadUserVote = async () => {
      if (address) {
        try {
          console.log(
            `🔍 Loading user vote for prediction ${prediction.id} on ${detectedChain} chain`
          );
          const vote = await getUserVote(prediction.id, address, detectedChain);
          console.log(
            `✅ Successfully loaded user vote for prediction ${prediction.id}:`,
            vote
          );
          setUserVote(vote);
        } catch (error) {
          console.error(
            `❌ Error getting user vote for prediction ${prediction.id} on ${detectedChain} chain:`,
            error
          );
          setUserVote(null); // Set to null on error to handle UI state
        }
      }
    };

    const loadFeeInfo = async () => {
      try {
        console.log(`💰 Loading fee info for ${detectedChain} chain`);
        const info = await getFeeInfo(detectedChain);
        setFeeInfo(info);
      } catch (error) {
        console.error(`Error loading fee info for ${detectedChain}:`, error);
        setFeeInfo(null); // Set to null on error to handle UI state
      }
    };

    loadUserVote();
    loadFeeInfo();
  }, [prediction.id, address, detectedChain, getUserVote, getFeeInfo]);

  const odds = calculateOdds(prediction.yesVotes, prediction.noVotes);
  const isActive = prediction.status === PredictionStatus.ACTIVE;
  const timeLeft = formatDistanceToNow(new Date(prediction.targetDate * 1000), {
    addSuffix: true,
  });

  const handleVote = async (isYes: boolean) => {
    console.log(
      `🎯 Voting with amount: ${amount} ${chainConfig.nativeCurrency.symbol}`
    );

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Validate minimum amount
    const minAmount = parseFloat(stakingRecs.minAmount);
    const currentAmount = parseFloat(amount);

    if (currentAmount < minAmount) {
      toast.error(
        `Minimum stake is ${stakingRecs.minAmount} ${chainConfig.nativeCurrency.symbol}`
      );
      return;
    }

    setIsVoting(true);
    try {
      console.log(
        `🚀 Calling onVote with: predictionId=${prediction.id}, isYes=${isYes}, amount=${amount}`
      );
      await onVote(prediction.id, isYes, amount);
      setShowSharePrompt(true);

      // Reload user vote after successful vote
      if (address) {
        console.log(
          `🔄 Reloading user vote for prediction ${prediction.id} on ${detectedChain} chain after vote`
        );
        const vote = await getUserVote(prediction.id, address, detectedChain);
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

  // Compact mobile-first version
  if (simplified || compact) {
    const truncatedTitle =
      prediction.title.length > 50
        ? prediction.title.substring(0, 50) + "..."
        : prediction.title;

    return (
      <div className="relative">
        <Confetti active={showConfetti} />

        {showSharePrompt && userVote && (
          <div
            className={`absolute top-0 right-0 left-0 ${colors.button} text-white p-1 rounded-t-lg flex items-center justify-between z-10`}
          >
            <div className="flex items-center">
              <FaFireAlt className="mr-1 animate-pulse" size={12} />
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

        {/* Compact header with chain badge and time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{chainConfig.emoji}</span>
            <span className={`text-xs font-medium ${colors.text}`}>
              {chainConfig.name.split(" ")[0]} {/* Just "CELO" or "Base" */}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {timeLeft.replace(" left", "")}
            </span>
          </div>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
        </div>

        {/* Compact title */}
        <h3
          className="text-sm font-medium mb-2 leading-tight"
          title={prediction.title}
        >
          {truncatedTitle}
        </h3>

        {/* Compact odds display */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-green-400 font-medium">YES {odds.yes}%</span>
            <span className="text-red-400 font-medium">NO {odds.no}%</span>
          </div>
          <span className="text-gray-400">
            {prediction.totalStaked.toFixed(1)}{" "}
            {chainConfig.nativeCurrency.symbol}
          </span>
        </div>

        {/* Simplified staking with custom input option */}
        {expanded && (
          <div className="mb-3 p-2 bg-gray-900 bg-opacity-30 rounded">
            <div className="text-xs text-gray-400 mb-2">
              Stake Amount:{" "}
              <span className={`font-bold ${colors.text}`}>
                {amount} {chainConfig.nativeCurrency.symbol}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {stakingRecs.recommendedAmounts.slice(0, 3).map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setAmount(amt);
                    setShowCustomInput(false);
                    setCustomAmount(""); // Clear custom input when selecting preset
                  }}
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    amount === amt && !showCustomInput
                      ? `${colors.bg} bg-opacity-50 ${colors.text} ring-1 ring-current`
                      : `bg-gray-800 text-gray-300 hover:bg-gray-700`
                  }`}
                >
                  {amt} {chainConfig.nativeCurrency.symbol}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCustomInput(!showCustomInput);
                  if (!showCustomInput) {
                    // When opening custom input, clear any preset selection
                    setCustomAmount(amount);
                  }
                }}
                className={`text-xs px-2 py-1 rounded transition-all ${
                  showCustomInput
                    ? `${colors.bg} bg-opacity-50 ${colors.text} ring-1 ring-current`
                    : `bg-gray-800 text-gray-300 hover:bg-gray-700`
                }`}
              >
                Custom
              </button>
            </div>

            {showCustomInput && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.001"
                    min={stakingRecs.minAmount}
                    placeholder={`Enter amount (min: ${stakingRecs.minAmount})`}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        if (
                          customAmount &&
                          parseFloat(customAmount) >=
                            parseFloat(stakingRecs.minAmount)
                        ) {
                          setAmount(customAmount);
                          setShowCustomInput(false);
                          setCustomAmount("");
                        }
                      }
                      if (e.key === "Escape") {
                        setShowCustomInput(false);
                        setCustomAmount("");
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <span className="text-xs text-gray-400">
                    {chainConfig.nativeCurrency.symbol}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      const amount = parseFloat(customAmount);
                      const minAmount = parseFloat(stakingRecs.minAmount);

                      if (customAmount && amount >= minAmount) {
                        console.log(
                          `🎯 Setting custom amount: ${customAmount} ${chainConfig.nativeCurrency.symbol}`
                        );
                        setAmount(customAmount);
                        setShowCustomInput(false);
                        setCustomAmount("");
                        toast.success(
                          `Amount set to ${customAmount} ${chainConfig.nativeCurrency.symbol}`
                        );
                      } else {
                        toast.error(
                          `Please enter a valid amount (min: ${stakingRecs.minAmount} ${chainConfig.nativeCurrency.symbol})`
                        );
                      }
                    }}
                    disabled={
                      !customAmount ||
                      parseFloat(customAmount) <
                        parseFloat(stakingRecs.minAmount)
                    }
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set Amount
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomAmount("");
                    }}
                    className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact action buttons */}
        <div className="flex items-center space-x-1">
          {!expanded && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <span>{amount}</span>
              <span>{chainConfig.nativeCurrency.symbol}</span>
            </div>
          )}

          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50 transition-colors"
          >
            YES
          </button>

          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50 transition-colors"
          >
            NO
          </button>

          {!expanded && onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
              title="More options"
            >
              ⋯
            </button>
          )}
        </div>

        {userVote && (
          <button
            onClick={handleShare}
            className={`w-full mt-2 ${colors.button} text-white px-2 py-1 rounded text-xs flex items-center justify-center hover:opacity-90 transition-opacity`}
          >
            <FaShare className="mr-1" size={10} /> Share
          </button>
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
