/**
 * AgentKit Transaction Modal
 * Gives users choice between regular wallet transactions and gasless AgentKit transactions
 */

import React, { useState } from "react";
import {
  FaRobot,
  FaWallet,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaInfoCircle,
} from "react-icons/fa";

interface TransactionOption {
  id: "wallet" | "agentkit";
  title: string;
  description: string;
  icon: React.ReactNode;
  gasless: boolean;
  network: string;
  estimatedCost: string;
  benefits: string[];
  requirements: string[];
}

interface AgentKitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: "wallet" | "agentkit") => void;
  predictionTitle: string;
  targetNetwork: "celo" | "base";
  isLoading: boolean;
  currentStep?: string;
}

const AgentKitTransactionModal: React.FC<AgentKitTransactionModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
  predictionTitle,
  targetNetwork,
  isLoading,
  currentStep,
}) => {
  const [selectedOption, setSelectedOption] = useState<
    "wallet" | "agentkit" | null
  >(null);

  if (!isOpen) return null;

  const transactionOptions: TransactionOption[] = [
    {
      id: "wallet",
      title: "Your Wallet",
      description: "Use your connected wallet to create the prediction",
      icon: <FaWallet className="text-blue-400" size={24} />,
      gasless: false,
      network: targetNetwork === "celo" ? "CELO Mainnet" : "Base Sepolia",
      estimatedCost: targetNetwork === "celo" ? "~$0.01 CELO" : "~$0.01 ETH",
      benefits: [
        "Full control over transaction",
        "Direct blockchain interaction",
        "Immediate confirmation",
      ],
      requirements: [
        "Sufficient balance for gas fees",
        "Wallet signature required",
        "Network must be switched manually",
      ],
    },
    {
      id: "agentkit",
      title: "AgentKit (Gasless)",
      description: "Use Coinbase AgentKit for gasless transactions on Base",
      icon: <FaRobot className="text-purple-400" size={24} />,
      gasless: true,
      network: "Base Sepolia",
      estimatedCost: "FREE (Gasless)",
      benefits: [
        "🆓 No gas fees required",
        "⚡ Powered by Coinbase CDP",
        "🤖 AI-enhanced transaction",
        "🔄 Automatic network handling",
      ],
      requirements: [
        "Available only on Base Sepolia",
        "Processed via AgentKit",
        "May take slightly longer",
      ],
    },
  ];

  // Filter options based on target network
  const availableOptions =
    targetNetwork === "base"
      ? transactionOptions
      : transactionOptions.filter((opt) => opt.id === "wallet");

  const handleSelectOption = (optionId: "wallet" | "agentkit") => {
    setSelectedOption(optionId);
    onSelectOption(optionId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-2 border-purple-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-purple-600">
          <div>
            <h2 className="text-xl font-bold text-purple-400">
              Choose Transaction Method
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Creating: &ldquo;{predictionTitle.substring(0, 50)}...&rdquo;
            </p>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-6 text-center">
            <FaSpinner
              className="animate-spin text-purple-400 mx-auto mb-4"
              size={32}
            />
            <h3 className="text-lg font-semibold text-white mb-2">
              Creating Prediction...
            </h3>
            <p className="text-gray-400">
              {currentStep || "Processing your transaction..."}
            </p>
          </div>
        )}

        {/* Transaction Options */}
        {!isLoading && (
          <div className="p-4 space-y-4">
            {availableOptions.map((option) => (
              <div
                key={option.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? "border-purple-500 bg-purple-900 bg-opacity-20"
                    : "border-gray-600 hover:border-purple-400 bg-gray-800 bg-opacity-50"
                }`}
                onClick={() => handleSelectOption(option.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{option.icon}</div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {option.title}
                      </h3>
                      {option.gasless && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          GASLESS
                        </span>
                      )}
                    </div>

                    <p className="text-gray-300 text-sm mb-3">
                      {option.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaInfoCircle className="text-blue-400" size={12} />
                          <span className="text-blue-400 font-medium">
                            Details
                          </span>
                        </div>
                        <div className="space-y-1 text-gray-300">
                          <div>Network: {option.network}</div>
                          <div>Cost: {option.estimatedCost}</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FaCheck className="text-green-400" size={12} />
                          <span className="text-green-400 font-medium">
                            Benefits
                          </span>
                        </div>
                        <ul className="space-y-1 text-gray-300">
                          {option.benefits.slice(0, 2).map((benefit, idx) => (
                            <li key={idx} className="text-xs">
                              • {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === option.id
                          ? "border-purple-500 bg-purple-500"
                          : "border-gray-400"
                      }`}
                    >
                      {selectedOption === option.id && (
                        <FaCheck className="text-white" size={12} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* AgentKit Info Banner */}
            {targetNetwork === "base" && (
              <div className="bg-gradient-to-r from-purple-900 to-blue-900 bg-opacity-40 border border-purple-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaRobot className="text-purple-400" />
                  <span className="text-purple-400 font-semibold">
                    AgentKit Integration
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  This app is powered by Coinbase AgentKit for the Base Batches
                  Messaging Buildathon. Experience gasless transactions and
                  AI-enhanced blockchain operations!
                </p>
              </div>
            )}

            {/* CELO Network Notice */}
            {targetNetwork === "celo" && (
              <div className="bg-yellow-900 bg-opacity-40 border border-yellow-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaInfoCircle className="text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">
                    CELO Network
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  AgentKit gasless transactions are currently available only on
                  Base Sepolia. CELO predictions use your wallet with minimal
                  gas fees.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isLoading && (
          <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                selectedOption && handleSelectOption(selectedOption)
              }
              disabled={!selectedOption}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {selectedOption === "agentkit" && <FaRobot size={16} />}
              {selectedOption === "wallet" && <FaWallet size={16} />}
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentKitTransactionModal;
