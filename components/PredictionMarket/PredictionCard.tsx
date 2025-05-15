"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { FaArrowUp, FaArrowDown, FaShare } from "react-icons/fa";
import {
  Prediction,
  PredictionStatus,
  PredictionOutcome,
  calculateOdds,
  voteOnPrediction,
  getUserVote,
  claimReward,
  getFeeInfo,
} from "@/lib/prediction-market-v2";
import { formatDistanceToNow } from "date-fns";
import { sdk } from "@farcaster/frame-sdk";
import { env } from "@/lib/env";

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
  const [isVoting, setIsVoting] = useState(false);
  const [amount, setAmount] = useState("0.1");
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

  const handleVote = async (isYes: boolean) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isActive) {
      toast.error("This prediction is no longer active");
      return;
    }

    try {
      setIsVoting(true);
      await voteOnPrediction(prediction.id, isYes, parseFloat(amount));
      toast.success(`You voted ${isYes ? "YES" : "NO"} with ${amount} CELO`);
      onVote();

      // Refresh user vote
      const vote = await getUserVote(prediction.id, address);
      setUserVote(vote);
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleClaimReward = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

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

    const userVotedCorrectly =
      (prediction.outcome === PredictionOutcome.YES && userVote.isYes) ||
      (prediction.outcome === PredictionOutcome.NO && !userVote.isYes);

    if (!userVotedCorrectly) {
      toast.error("You voted incorrectly and cannot claim a reward");
      return;
    }

    try {
      setIsVoting(true);
      await claimReward(prediction.id);
      toast.success("Reward claimed successfully!");
      onVote();

      // Refresh user vote
      const vote = await getUserVote(prediction.id, address);
      setUserVote(vote);
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = async () => {
    try {
      const appUrl = env.NEXT_PUBLIC_URL;
      const userChoice = userVote?.isYes ? "YES" : "NO";
      const predictionTitle = prediction.title;
      const network = prediction.network;

      // Create a cast with the prediction information
      const castText = `I just predicted ${userChoice} on "${predictionTitle}" for ${network} on Imperfect Form!\n\nCurrent odds: YES ${odds.yes}% / NO ${odds.no}%\n\n15% of all stakes go to @greenpillnetwork Kenya 🇰🇪\n\nJoin me and make your prediction! 💪`;

      // Share to Farcaster using composeCast instead of share
      await sdk.actions.composeCast({
        text: castText,
        // The Farcaster SDK expects embeds to be an array of strings (URLs)
        embeds: [`${appUrl}/predictions/${prediction.id}`],
      });

      toast.success("Shared to Farcaster!");
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      toast.error("Failed to share. Please try again.");
    }
  };

  // Simplified version for the network cards
  if (simplified) {
    return (
      <div>
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center"
            >
              <FaShare className="mr-1" /> Share
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 mb-4 shadow-lg">
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
