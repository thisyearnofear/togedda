"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "react-hot-toast";
import { FaArrowUp, FaArrowDown, FaShare, FaFireAlt } from "react-icons/fa";
import {
  Prediction,
  PredictionStatus,
  PredictionOutcome,
  calculateOdds,
  getUserVote,
  getFeeInfo,
  PREDICTION_MARKET_ADDRESS,
} from "@/lib/prediction-market-v2";
import { formatDistanceToNow } from "date-fns";
import { env } from "@/lib/env";
import Confetti from "@/components/Confetti";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { predictionMarketABI } from "@/lib/constants";
import { parseEther } from "viem";

interface PredictionCardProps {
  prediction: Prediction;
  onVote: () => void;
  simplified?: boolean;
}

const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onVote,
  simplified = false,
}) => {
  const { address } = useAccount();
  const { context } = useMiniKit();
  const [isVoting, setIsVoting] = useState(false);
  const [amount, setAmount] = useState("0.1");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [userVote, setUserVote] = useState<{
    isYes: boolean;
    amount: number;
    claimed: boolean;
  } | null>(null);
  const [feeInfo, setFeeInfo] = useState<{
    charityFeePercentage: number;
    maintenanceFeePercentage: number;
    totalFeePercentage: number;
  } | null>(null);

  const odds = calculateOdds(prediction.yesVotes, prediction.noVotes);
  const isActive = prediction.status === PredictionStatus.ACTIVE;
  const isResolved = prediction.status === PredictionStatus.RESOLVED;
  const targetDate = new Date(prediction.targetDate * 1000);
  const timeLeft = formatDistanceToNow(targetDate, { addSuffix: true });

  useEffect(() => {
    const loadUserVote = async () => {
      if (address && prediction.id) {
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
        const fees = await getFeeInfo();
        setFeeInfo(fees);
      } catch (error) {
        console.error("Error loading fee info:", error);
      }
    };

    loadUserVote();
    loadFeeInfo();
  }, [address, prediction.id]);

  // Set up Wagmi hooks for contract interaction
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<string | null>(null);
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash as `0x${string}` | undefined,
    });

  // Watch for transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      console.log(`Transaction confirmed: ${txHash}`);
      toast.success("Transaction confirmed!");

      // Refresh user vote data
      if (address && prediction.id) {
        getUserVote(prediction.id, address)
          .then((vote) => {
            if (vote) {
              setUserVote(vote);
            }
          })
          .catch((error) => {
            console.error("Error refreshing vote data:", error);
          });
      }
    }
  }, [isConfirmed, txHash, address, prediction.id]);

  const handleVote = async (isYes: boolean) => {
    if (!isActive) {
      toast.error("This prediction is not active");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsVoting(true);

      // Convert amount to Wei (CELO uses same units as ETH)
      const amountInWei = parseEther(amount);

      // Prepare transaction
      console.log(
        `Voting on prediction ${prediction.id}, isYes: ${isYes}, amount: ${amount} CELO`
      );

      // Send transaction using Wagmi
      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
        abi: predictionMarketABI,
        functionName: "vote",
        args: [BigInt(prediction.id), isYes],
        value: amountInWei,
      });

      // Store transaction hash
      setTxHash(hash);

      // Show success feedback
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast.success(
        `Transaction sent! You voted ${
          isYes ? "YES" : "NO"
        } with ${amount} CELO`
      );

      // Optimistically update the UI
      const tempVote = {
        isYes: isYes,
        amount: parseFloat(amount),
        claimed: false,
      };
      setUserVote(tempVote);

      // Notify parent component
      onVote();

      // Show share prompt
      setShowSharePrompt(true);
      setTimeout(() => setShowSharePrompt(false), 10000);
    } catch (error: any) {
      console.error("Error voting:", error);

      // Check if it's a user rejection error
      if (
        error.message &&
        (error.message.includes("rejected") || error.message.includes("denied"))
      ) {
        toast.error("Transaction cancelled by user");
      } else {
        // For other errors, show the error message
        toast.error(error.message || "Transaction failed");
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleClaimReward = async () => {
    if (!isResolved) {
      toast.error("This prediction is not resolved yet");
      return;
    }

    if (!userVote) {
      toast.error("You didn't vote on this prediction");
      return;
    }

    if (userVote.claimed) {
      toast.error("You already claimed your reward");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    const userVotedCorrectly =
      (prediction.outcome === PredictionOutcome.YES && userVote.isYes) ||
      (prediction.outcome === PredictionOutcome.NO && !userVote.isYes);

    if (!userVotedCorrectly) {
      toast.error("You voted incorrectly and cannot claim a reward");
      return;
    }

    try {
      setIsVoting(true);

      // Prepare transaction
      console.log(`Claiming reward for prediction ${prediction.id}`);

      // Send transaction using Wagmi
      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
        abi: predictionMarketABI,
        functionName: "claimReward",
        args: [BigInt(prediction.id)],
      });

      // Store transaction hash
      setTxHash(hash);

      // Show success feedback
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast.success("Transaction sent! Claiming your reward...");

      // Optimistically update the UI
      if (userVote) {
        const updatedVote = {
          ...userVote,
          claimed: true,
        };
        setUserVote(updatedVote);
      }

      // Notify parent component
      onVote();

      // Show share prompt
      setShowSharePrompt(true);
      setTimeout(() => setShowSharePrompt(false), 10000);
    } catch (error: any) {
      console.error("Error claiming reward:", error);

      // Check if it's a user rejection error
      if (
        error.message &&
        (error.message.includes("rejected") || error.message.includes("denied"))
      ) {
        toast.error("Transaction cancelled by user");
      } else {
        // For other errors, show the error message
        toast.error(error.message || "Transaction failed");
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Helper function to get network emoji
  const getNetworkEmoji = (network: string): string => {
    switch (network.toLowerCase()) {
      case "celo":
        return "🟡";
      case "polygon":
        return "🟣";
      case "base":
        return "🔵";
      case "monad":
        return "⚫";
      default:
        return "🌐";
    }
  };

  const handleShare = async () => {
    try {
      // Import the SDK dynamically to avoid SSR issues
      const { sdk } = await import("@farcaster/frame-sdk");

      const appUrl = env.NEXT_PUBLIC_URL;
      const userChoice = userVote?.isYes ? "YES" : "NO";
      const predictionTitle = prediction.title;
      const network = prediction.network;
      const networkEmoji = getNetworkEmoji(network);

      // Create a more engaging cast with emojis and hashtags
      const castText = `${networkEmoji} I just predicted ${userChoice} on "${predictionTitle}" for ${network}!\n\nCurrent odds: YES ${odds.yes}% / NO ${odds.no}%\n\n15% goes to @greenpillnetwork Kenya 🇰🇪\n\nJoin me and make your prediction! 💪 #ImperfectForm #StayHard`;

      // Share to Farcaster
      await sdk.actions.composeCast({
        text: castText,
        embeds: [`${appUrl}/predictions/${prediction.id}`],
      });

      // Show success feedback
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast.success("Shared to Farcaster!");
      setShowSharePrompt(false); // Hide share prompt after sharing
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      toast.error("Failed to share. Please try again.");
    }
  };

  // Simplified version for the network cards
  if (simplified) {
    return (
      <div className="relative">
        {/* Confetti animation */}
        <Confetti active={showConfetti} />

        {/* Share prompt */}
        {showSharePrompt && userVote && (
          <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white p-2 rounded-t-lg flex items-center justify-between z-10">
            <div className="flex items-center">
              <FaFireAlt className="mr-2 animate-pulse" />
              <span className="text-xs">Share!</span>
            </div>
            <button
              onClick={handleShare}
              className="bg-white text-blue-600 px-2 py-1 rounded text-xs font-bold"
            >
              Share
            </button>
          </div>
        )}

        <h2 className="text-lg font-bold mb-2">{prediction.title}</h2>
        <p className="text-sm text-gray-300 mb-3">{prediction.description}</p>

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
              {prediction.totalStaked.toFixed(1)} CELO
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center"
          >
            <FaArrowUp className="mr-1" /> YES
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center"
          >
            <FaArrowDown className="mr-1" /> NO
          </button>
        </div>

        {userVote && (
          <div className="mt-2">
            <button
              onClick={handleShare}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center animate-pulse"
            >
              <FaShare className="mr-1" /> Share Position
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 mb-4 shadow-lg relative">
      {/* Confetti animation */}
      <Confetti active={showConfetti} />

      {/* Share prompt */}
      {showSharePrompt && userVote && (
        <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white p-2 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center">
            <FaFireAlt className="mr-2 animate-pulse" />
            <span>Share your prediction!</span>
          </div>
          <button
            onClick={handleShare}
            className="bg-white text-blue-600 px-2 py-1 rounded text-sm font-bold"
          >
            Share Now
          </button>
        </div>
      )}

      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">{prediction.emoji}</span>
        <div>
          <h3 className="text-lg font-bold">[{prediction.network}]</h3>
          <p className="text-sm text-gray-400">Ends {timeLeft}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">{prediction.title}</h2>
      <p className="text-sm text-gray-300 mb-4">{prediction.description}</p>

      {feeInfo && (
        <div className="bg-green-900 bg-opacity-20 border border-green-800 rounded p-2 mb-4">
          <p className="text-sm text-green-400">
            <span className="font-bold">Charity Impact:</span>{" "}
            {feeInfo.charityFeePercentage}% of all stakes go to Greenpill Kenya
          </p>
        </div>
      )}

      <div className="flex justify-between mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-400">YES</p>
          <p className="text-xl font-bold">{odds.yes}%</p>
          <p className="text-xs text-gray-500">
            {prediction.yesVotes.toFixed(2)} CELO
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400">NO</p>
          <p className="text-xl font-bold">{odds.no}%</p>
          <p className="text-xs text-gray-500">
            {prediction.noVotes.toFixed(2)} CELO
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-xl font-bold">
            {prediction.totalStaked.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">CELO</p>
        </div>
      </div>

      {isActive ? (
        <div>
          <div className="flex mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-l p-2 text-white"
              placeholder="Amount (CELO)"
              min="0.01"
              step="0.01"
            />
            <button
              onClick={() => handleVote(true)}
              disabled={isVoting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center"
            >
              <FaArrowUp className="mr-1" /> YES
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={isVoting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r flex items-center"
            >
              <FaArrowDown className="mr-1" /> NO
            </button>
          </div>

          {userVote && (
            <div className="bg-gray-800 p-2 rounded mb-4">
              <p className="text-sm">
                Your position:{" "}
                <span
                  className={userVote.isYes ? "text-green-400" : "text-red-400"}
                >
                  {userVote.isYes ? "YES" : "NO"}
                </span>{" "}
                with {userVote.amount.toFixed(2)} CELO
              </p>
            </div>
          )}

          {userVote && (
            <button
              onClick={handleShare}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center"
            >
              <FaShare className="mr-2" /> Share Position on Farcaster
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-gray-800 p-3 rounded mb-4">
            <p className="font-bold">
              Outcome:{" "}
              {prediction.outcome === PredictionOutcome.YES ? "YES" : "NO"}
            </p>
            {userVote && (
              <p className="text-sm mt-2">
                Your position:{" "}
                <span
                  className={userVote.isYes ? "text-green-400" : "text-red-400"}
                >
                  {userVote.isYes ? "YES" : "NO"}
                </span>{" "}
                with {userVote.amount.toFixed(2)} CELO
              </p>
            )}
          </div>

          {userVote && !userVote.claimed && (
            <button
              onClick={handleClaimReward}
              disabled={isVoting}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
            >
              Claim Reward
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionCard;
