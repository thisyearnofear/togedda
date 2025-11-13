import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { FaArrowUp, FaArrowDown, FaShare, FaFireAlt, FaGlobe } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { ChainPrediction, CHAIN_CONFIG, getStakingRecommendations } from '@/lib/dual-chain-service';
import { useChainContracts } from '@/hooks/use-chain-contracts';
import { calculateOdds } from '@/lib/prediction-market-v2';

interface CrossPlatformPredictionCardProps {
  prediction: ChainPrediction;
  onVote: (
    predictionId: number,
    isYes: boolean,
    amount: string
  ) => Promise<void>;
  simplified?: boolean;
}

const CrossPlatformPredictionCard: React.FC<CrossPlatformPredictionCardProps> = ({
  prediction,
  onVote,
  simplified = false,
}) => {
  const { address } = useAccount();
  const { getUserVote } = useChainContracts();
  const [isVoting, setIsVoting] = useState(false);
  const [amount, setAmount] = useState("0.01"); // Default to smaller amount for cross-platform
  
  const [userVote, setUserVote] = useState<{
    isYes: boolean;
    amount: number;
    claimed: boolean;
  } | null>(null);

  // Assuming cross-platform predictions use BNB chain as default
  const chainConfig = CHAIN_CONFIG['bsc'];
  const stakingRecs = getStakingRecommendations('bsc');

  const odds = calculateOdds(prediction.yesVotes, prediction.noVotes);
  const timeLeft = formatDistanceToNow(new Date(prediction.targetDate * 1000), {
    addSuffix: true,
  });

  // Determine which platforms are involved in this prediction
  const platforms = prediction.network === 'cross-platform' 
    ? ['imperfectform', 'imperfectcoach', 'imperfectabs']
    : prediction.network.split(',');

  // Platform icons mapping
  const platformIcons: Record<string, string> = {
    'imperfectform': '💪',
    'imperfectcoach': '🏋️',
    'imperfectabs': '🏃',
  };

  const handleVote = async (isYes: boolean) => {
    setIsVoting(true);
    try {
      await onVote(prediction.id, isYes, amount);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  // Compact simplified view
  if (simplified) {
    const truncatedTitle =
      prediction.title.length > 50
        ? prediction.title.substring(0, 50) + "..."
        : prediction.title;

    return (
      <div className="relative">
        {/* Multi-sports-platform indicator */}
        <div className="flex items-center mb-2">
          <FaGlobe className="text-yellow-400 mr-1" size={12} />
          <span className="text-xs text-yellow-400 font-medium">Multi-Sports</span>
          <div className="ml-2 flex space-x-1">
            {platforms.map((platform, index) => (
              <span key={index} className="text-xs" title={platform}>
                {platformIcons[platform] || '🌐'}
              </span>
            ))}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-medium mb-2 leading-tight"
          title={prediction.title}
        >
          {truncatedTitle}
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {prediction.description.length > 80
            ? prediction.description.substring(0, 80) + "..."
            : prediction.description}
        </p>

        {/* Odds and stats */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-green-400 font-medium">YES {odds.yes}%</span>
            <span className="text-red-400 font-medium">NO {odds.no}%</span>
          </div>
          <span className="text-gray-400">
            {prediction.totalStaked.toFixed(2)} {chainConfig.nativeCurrency.symbol}
          </span>
        </div>

        {/* Time remaining */}
        <div className="text-xs text-gray-500 mb-3">
          Ends {timeLeft}
        </div>

        {/* Stake amount selector */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Stake Amount:</div>
          <div className="flex flex-wrap gap-1">
            {['0.01', '0.05', '0.1', '0.5'].map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`text-xs px-2 py-1 rounded ${
                  amount === amt
                    ? 'bg-yellow-600 text-white ring-1 ring-yellow-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {amt} {chainConfig.nativeCurrency.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {isVoting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-1">⏳</span> Voting...
              </span>
            ) : (
              <span className="flex items-center">
                <FaArrowUp className="mr-1" size={10} /> YES {odds.yes}%
              </span>
            )}
          </button>

          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {isVoting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-1">⏳</span> Voting...
              </span>
            ) : (
              <span className="flex items-center">
                <FaArrowDown className="mr-1" size={10} /> NO {odds.no}%
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Full version (if needed later)
  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 mb-4 shadow-lg relative">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center mb-2">
            <FaGlobe className="text-yellow-400 mr-2" />
            <h3 className="text-lg font-bold text-yellow-400">Multi-Sports Prediction</h3>
          </div>
          
          <div className="flex space-x-2 mb-2">
            {platforms.map((platform, index) => (
              <span 
                key={index} 
                className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center"
              >
                {platformIcons[platform] || '🌐'} {platform}
              </span>
            ))}
          </div>
        </div>
        
        <span className="text-gray-400 text-sm">{timeLeft}</span>
      </div>

      <h4 className="text-xl font-bold mb-2">{prediction.title}</h4>
      
      <p className="text-gray-300 mb-4">{prediction.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-green-400 font-bold text-center text-lg">YES {odds.yes}%</div>
          <div className="text-center text-sm text-gray-400">Staked: {prediction.yesVotes.toFixed(2)} BNB</div>
        </div>
        
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-red-400 font-bold text-center text-lg">NO {odds.no}%</div>
          <div className="text-center text-sm text-gray-400">Staked: {prediction.noVotes.toFixed(2)} BNB</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          <span className="text-gray-400">Total Staked: </span>
          <span className="font-bold">{prediction.totalStaked.toFixed(2)} BNB</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Target: </span>
          <span className="font-bold">{prediction.targetValue}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <input
          type="number"
          step="0.001"
          min="0.001"
          placeholder="0.01 BNB"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
        />
        <span className="text-gray-400">{chainConfig.nativeCurrency.symbol}</span>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => handleVote(true)}
          disabled={isVoting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isVoting ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2">⏳</span> Processing...
            </span>
          ) : (
            <span className="flex items-center">
              <FaArrowUp className="mr-2" /> Vote YES
            </span>
          )}
        </button>

        <button
          onClick={() => handleVote(false)}
          disabled={isVoting}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isVoting ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2">⏳</span> Processing...
            </span>
          ) : (
            <span className="flex items-center">
              <FaArrowDown className="mr-2" /> Vote NO
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CrossPlatformPredictionCard;