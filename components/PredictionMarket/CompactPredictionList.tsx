"use client";

import React, { useState } from "react";
import {
  Prediction,
  PredictionStatus,
  calculateOdds,
} from "@/lib/prediction-market-v2";
import { formatDistanceToNow } from "date-fns";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";

interface CompactPredictionListProps {
  predictions: Prediction[];
  networkName: string;
  networkEmoji: string;
  networkColor: string;
  onPredictionSelect?: (prediction: Prediction) => void;
  maxVisible?: number;
}

const CompactPredictionList: React.FC<CompactPredictionListProps> = ({
  predictions,
  networkName,
  networkEmoji,
  networkColor,
  onPredictionSelect,
  maxVisible = 2,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activePredictions = predictions
    .filter((p) => p.status === PredictionStatus.ACTIVE)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Sort newest first
  const displayPredictions = isExpanded
    ? activePredictions
    : activePredictions.slice(0, maxVisible);
  const hasMore = activePredictions.length > maxVisible;

  if (activePredictions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400 mb-2">
          No active predictions for {networkName}
        </p>
        <p className="text-xs text-gray-500">
          Create one via AI chat to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayPredictions.map((prediction, index) => {
        const odds = calculateOdds(prediction.yesVotes, prediction.noVotes);
        const targetDate = new Date(prediction.targetDate * 1000);
        const timeLeft = formatDistanceToNow(targetDate, { addSuffix: true });
        const totalVotes = prediction.yesVotes + prediction.noVotes;

        return (
          <div
            key={`${prediction.id}-${index}`}
            className={`border border-gray-700 rounded-lg p-3 hover:border-${networkColor} transition-colors cursor-pointer`}
            onClick={() => onPredictionSelect?.(prediction)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4
                  className="text-sm font-bold truncate"
                  title={prediction.title}
                >
                  {prediction.title}
                </h4>
                <p className="text-xs text-gray-400">Ends {timeLeft}</p>
              </div>
              <div className="flex items-center ml-2">
                <span className="text-lg">{prediction.emoji}</span>
                {onPredictionSelect && (
                  <FaExternalLinkAlt className="ml-1 text-xs text-gray-500" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <p className="text-gray-400">YES</p>
                <p className="font-bold text-green-400">{odds.yes}%</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">NO</p>
                <p className="font-bold text-red-400">{odds.no}%</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400">Volume</p>
                <p className="font-bold">
                  {prediction.totalStaked.toFixed(2)}
                  <span className="text-xs ml-1">
                    {networkName.includes("CELO") ? "CELO" : "ETH"}
                  </span>
                </p>
              </div>
            </div>

            {totalVotes > 0 && (
              <div className="mt-2">
                <div className="flex bg-gray-800 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${odds.yes}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all duration-300"
                    style={{ width: `${odds.no}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center justify-center mx-auto"
          >
            {isExpanded ? (
              <>
                <FaChevronUp className="mr-1" />
                Show less
              </>
            ) : (
              <>
                <FaChevronDown className="mr-1" />+
                {activePredictions.length - maxVisible} more predictions
              </>
            )}
          </button>
        </div>
      )}

      {activePredictions.length > 0 && (
        <div className="text-center pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            {networkEmoji} {activePredictions.length} active on {networkName}
          </p>
        </div>
      )}
    </div>
  );
};

export default CompactPredictionList;
