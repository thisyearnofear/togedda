"use client";

import React from "react";
import { FaExclamationTriangle, FaTimes, FaExchangeAlt } from "react-icons/fa";
import { getChainName, getChainSwitchInfo } from "@/lib/config/chains";

interface NetworkMismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchNetwork: () => void;
  currentChainId: number;
  targetChainId: number;
  targetChainName: string;
  isLoading?: boolean;
}

const NetworkMismatchModal: React.FC<NetworkMismatchModalProps> = ({
  isOpen,
  onClose,
  onSwitchNetwork,
  currentChainId,
  targetChainId,
  targetChainName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  // Get chain information using centralized utilities
  const currentChainName = getChainName(currentChainId);
  const targetChainInfo = getChainSwitchInfo(targetChainId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gray-900 border-2 border-red-600 rounded-lg max-w-md w-full p-6 relative transform transition-all duration-300 scale-100 animate-slideIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          <FaTimes size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle className="text-red-500 text-2xl" />
          <h2 className="text-xl font-bold text-red-400">Network Mismatch</h2>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-gray-300">
            Your wallet is connected to the wrong network for this transaction.
          </p>

          {/* Network comparison */}
          <div className="bg-black bg-opacity-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Current Network:</span>
              <span className="text-red-400 font-bold">{currentChainName}</span>
            </div>

            <div className="flex items-center justify-center">
              <FaExchangeAlt className="text-gray-500" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Required Network:</span>
              <span className="text-green-400 font-bold">
                {targetChainName}
              </span>
            </div>
          </div>

          {/* Chain-specific information */}
          <div
            className={`rounded-lg p-3 ${
              targetChainInfo.isTestnet
                ? "bg-blue-900 bg-opacity-20 border border-blue-800"
                : "bg-yellow-900 bg-opacity-20 border border-yellow-800"
            }`}
          >
            <p
              className={`text-sm ${
                targetChainInfo.isTestnet ? "text-blue-300" : "text-yellow-300"
              }`}
            >
              <strong>
                {targetChainInfo.emoji} {targetChainName}
              </strong>{" "}
              {targetChainInfo.description}.
              {targetChainInfo.faucetUrl && (
                <>
                  {" "}
                  You can get free test ETH from the{" "}
                  <a
                    href={targetChainInfo.faucetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    Base Sepolia faucet
                  </a>
                  .
                </>
              )}
              {targetChainInfo.isProduction && targetChainId === 42220 && (
                <> 15% of stakes go to charity (Greenpill Kenya).</>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSwitchNetwork}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Switching...
                </>
              ) : (
                <>
                  <FaExchangeAlt />
                  Switch to {targetChainName}
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 text-center">
            💡 You can also switch networks manually in your wallet
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMismatchModal;
