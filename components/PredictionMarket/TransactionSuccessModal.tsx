"use client";

import React, { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaExternalLinkAlt,
  FaChartLine,
  FaCoins,
  FaTimes,
} from "react-icons/fa";
import Confetti from "../Confetti";
import { CHAIN_CONFIG } from "@/lib/services/dual-chain-service";

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: "prediction" | "stake" | "claim";
  transactionHash?: string;
  predictionTitle?: string;
  stakeAmount?: string;
  currency?: string;
  chain?: "celo" | "base" | "bsc";
  predictionId?: number;
  onRefresh?: () => void;
}

const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  transactionType,
  transactionHash,
  predictionTitle,
  stakeAmount,
  currency = "ETH",
  chain = "base",
  predictionId,
  onRefresh,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getExplorerUrl = () => {
    if (!transactionHash) return "";
    const cfg = CHAIN_CONFIG[chain || "base"];
    const base = cfg.blockExplorer || "";
    return `${base}/tx/${transactionHash}`;
  };

  const getSuccessMessage = () => {
    switch (transactionType) {
      case "prediction":
        return {
          title: "🎉 Prediction Created!",
          subtitle: "Your prediction is now live on the blockchain",
          icon: <FaCheckCircle className="text-green-400 text-4xl" />,
        };
      case "stake":
        return {
          title: "💰 Stake Placed!",
          subtitle: `You've staked ${stakeAmount} ${currency}`,
          icon: <FaCoins className="text-yellow-400 text-4xl" />,
        };
      case "claim":
        return {
          title: "🏆 Reward Claimed!",
          subtitle: "Your winnings have been transferred",
          icon: <FaCheckCircle className="text-green-400 text-4xl" />,
        };
      default:
        return {
          title: "✅ Transaction Complete!",
          subtitle: "Your transaction was successful",
          icon: <FaCheckCircle className="text-green-400 text-4xl" />,
        };
    }
  };

  const message = getSuccessMessage();

  return (
    <>
      <Confetti active={showConfetti} duration={4000} />

      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-black border-2 border-green-400 rounded-lg p-6 max-w-md w-full relative animate-fadeIn">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <FaTimes />
          </button>

          {/* Success Icon and Message */}
          <div className="text-center mb-6">
            <div className="mb-4">{message.icon}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {message.title}
            </h2>
            <p className="text-gray-300 text-sm">{message.subtitle}</p>
            {predictionTitle && (
              <p className="text-gray-400 text-xs mt-2 italic">
                &quot;{predictionTitle}&quot;
              </p>
            )}
          </div>

          {/* Transaction Details */}
          {transactionHash && (
            <div className="bg-gray-900 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Transaction:</span>
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs flex items-center"
                >
                  {transactionHash.slice(0, 8)}...{transactionHash.slice(-6)}
                  <FaExternalLinkAlt className="ml-1" />
                </a>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">
              🚀 What&apos;s Next?
            </h3>

            {transactionType === "prediction" && (
              <div className="text-xs text-gray-300 space-y-2">
                <p>• Your prediction is now live and accepting stakes</p>
                <p>• Share it with friends to increase participation</p>
                <p>• Track progress in your personal dashboard</p>
              </div>
            )}

            {transactionType === "stake" && (
              <div className="text-xs text-gray-300 space-y-2">
                <p>• Your stake is locked until prediction resolves</p>
                <p>• Check back after the target date to claim rewards</p>
                <p>• Track all your stakes in &quot;My Stats&quot; section</p>
              </div>
            )}

            {transactionType === "claim" && (
              <div className="text-xs text-gray-300 space-y-2">
                <p>• Funds have been transferred to your wallet</p>
                <p>• Check your wallet balance to confirm</p>
                <p>• Thanks for participating! 🎉</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                // Navigate to dashboard/stats
                window.location.href = "/#stats";
                onClose();
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center"
            >
              <FaChartLine className="mr-1" />
              My Stats
            </button>

            {onRefresh && (
              <button
                onClick={() => {
                  onRefresh();
                  onClose();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center"
              >
                🔄 Refresh
              </button>
            )}

            {transactionHash && (
              <button
                onClick={() => window.open(getExplorerUrl(), "_blank")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center"
              >
                <FaExternalLinkAlt className="mr-1" />
                View TX
              </button>
            )}
          </div>

          {/* Motivational Message */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {transactionType === "stake" && "Carry The Boats 🚣🌊"}
              {transactionType === "prediction" && "Stay hard! 💪"}
              {transactionType === "claim" && "Well done! Keep building! 🔥"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionSuccessModal;
