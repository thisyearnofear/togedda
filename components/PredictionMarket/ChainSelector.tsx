"use client";

import React, { useState } from "react";
import { CHAIN_CONFIG, type SupportedChain, getStakingRecommendations } from "@/lib/services/dual-chain-service";
import { useSwitchChain, useChainId } from "wagmi";
import { toast } from "react-hot-toast";

interface ChainSelectorProps {
  selectedChain: SupportedChain;
  onChainSelect: (chain: SupportedChain) => void;
  showRecommendations?: boolean;
}

const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChain,
  onChainSelect,
  showRecommendations = true,
}) => {
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  const [isLoading, setIsLoading] = useState(false);

  const handleChainSelect = async (chain: SupportedChain) => {
    const config = CHAIN_CONFIG[chain];
    
    try {
      setIsLoading(true);
      
      // Switch wallet to the selected chain if needed
      if (currentChainId !== config.id) {
        await switchChain({ chainId: config.id });
        toast.success(`Switched to ${config.name}`);
      }
      
      onChainSelect(chain);
    } catch (error: any) {
      console.error('Error switching chain:', error);
      toast.error(`Failed to switch to ${config.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getChainStatus = (chain: SupportedChain) => {
    const config = CHAIN_CONFIG[chain];
    const isConnected = currentChainId === config.id;
    const isSelected = selectedChain === chain;
    
    return {
      isConnected,
      isSelected,
      statusText: isConnected ? 'Connected' : 'Switch Network',
      statusColor: isConnected ? 'text-green-400' : 'text-yellow-400'
    };
  };

  return (
    <div className="bg-black bg-opacity-50 border border-purple-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-bold text-purple-400 mb-4">
        🌐 Choose Your Chain
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {Object.entries(CHAIN_CONFIG).map(([chainKey, config]) => {
          const chain = chainKey as SupportedChain;
          const status = getChainStatus(chain);
          const recommendations = getStakingRecommendations(chain);
          
          return (
            <div
              key={chain}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                status.isSelected
                  ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => handleChainSelect(chain)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{config.emoji}</span>
                  <div>
                    <h4 className="font-bold" style={{ color: config.color }}>
                      {config.name}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {config.isProduction ? 'Production' : 'Testnet'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${status.statusColor}`}>
                    {status.statusText}
                  </p>
                  {status.isSelected && (
                    <p className="text-xs text-purple-400">Selected</p>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-300 mb-2">
                <p><strong>Currency:</strong> {config.nativeCurrency.symbol}</p>
                <p><strong>Min Stake:</strong> {recommendations.minAmount} {recommendations.currency}</p>
              </div>
              
              {config.isProduction ? (
                <div className="bg-green-900 bg-opacity-20 border border-green-800 rounded p-2">
                  <p className="text-xs text-green-400">
                    💰 Real money • 15% to charity
                  </p>
                </div>
              ) : (
                <div className="bg-blue-900 bg-opacity-20 border border-blue-800 rounded p-2">
                  <p className="text-xs text-blue-400">
                    🧪 Free testnet • Perfect for demos
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {showRecommendations && (
        <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3">
          <h4 className="text-sm font-bold text-gray-300 mb-2">💡 Recommendations:</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <p>🟡 <strong>CELO Mainnet:</strong> For real impact and charity donations</p>
            <p>🔵 <strong>Base Sepolia:</strong> For hackathon demos and experimentation</p>
            <p>🎯 <strong>Base Batches Buildathon:</strong> Showcase on Base Sepolia!</p>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="text-center text-purple-400 mt-2">
          <p className="text-sm">Switching networks...</p>
        </div>
      )}
    </div>
  );
};

export default ChainSelector;
