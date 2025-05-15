"use client";

import { NetworkData, Score } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName, truncateAddress } from "@/lib/utils";
import { useState } from "react";
import Web3Profile from "@/components/Web3Profile";

interface LeaderboardProps {
  data: NetworkData;
  selectedNetwork: string;
  isLoading: boolean;
}

export default function Leaderboard({
  data,
  selectedNetwork,
  isLoading,
}: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<"pushups" | "squats">("pushups");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Toggle sort order
  const toggleSort = (field: "pushups" | "squats") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Get all entries or filter by network
  const getEntries = (): Score[] => {
    if (selectedNetwork === "all") {
      // Combine all networks
      return Object.values(data).flat();
    } else {
      // Return specific network
      return data[selectedNetwork] || [];
    }
  };

  // Sort entries
  const sortedEntries = getEntries().sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (sortOrder === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Calculate total contributions for each user
  const calculateTotal = (entry: Score) => entry.pushups + entry.squats;

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">
        {selectedNetwork === "all"
          ? "Global Leaderboard"
          : `${getNetworkName(selectedNetwork)} Leaderboard`}
      </h2>

      <div className="flex justify-center mb-4">
        <div
          className={`px-4 py-2 mx-2 cursor-pointer ${
            sortBy === "pushups" ? "border-b-2 border-pink-500" : ""
          }`}
          onClick={() => toggleSort("pushups")}
        >
          <div className="flex items-center">
            <span className="mr-2">💪</span>
            <span>Push-ups</span>
            {sortBy === "pushups" && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </div>
        </div>
        <div
          className={`px-4 py-2 mx-2 cursor-pointer ${
            sortBy === "squats" ? "border-b-2 border-green-500" : ""
          }`}
          onClick={() => toggleSort("squats")}
        >
          <div className="flex items-center">
            <span className="mr-2">🏃</span>
            <span>Squats</span>
            {sortBy === "squats" && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {sortedEntries.length > 0 ? (
          <div className="space-y-4">
            {sortedEntries.slice(0, 10).map((entry, index) => {
              // Determine medal and styling
              let medalClass = "";
              let medalEmoji = "";
              let rowClass = "bg-opacity-10 hover:bg-opacity-20";

              if (index === 0) {
                medalClass = "border-yellow-400 text-yellow-400";
                medalEmoji = "🥇";
                rowClass = "bg-yellow-500 bg-opacity-20 hover:bg-opacity-30";
              } else if (index === 1) {
                medalClass = "border-gray-300 text-gray-300";
                medalEmoji = "🥈";
                rowClass = "bg-gray-500 bg-opacity-20 hover:bg-opacity-30";
              } else if (index === 2) {
                medalClass = "border-yellow-700 text-yellow-700";
                medalEmoji = "🥉";
                rowClass = "bg-yellow-700 bg-opacity-20 hover:bg-opacity-30";
              }

              return (
                <div
                  key={`${entry.user}-${index}`}
                  className={`flex items-center p-3 rounded-lg border border-gray-700 ${rowClass} transition-colors leaderboard-item`}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${medalClass} mr-3`}
                  >
                    {medalEmoji || index + 1}
                  </div>

                  <div className="flex-1">
                    <Web3Profile address={entry.user} />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <span className="text-xs mr-1">💪</span>
                        <span
                          className={`font-bold ${
                            sortBy === "pushups" ? "text-pink-500" : ""
                          }`}
                        >
                          {formatNumber(entry.pushups)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <span className="text-xs mr-1">🏃</span>
                        <span
                          className={`font-bold ${
                            sortBy === "squats" ? "text-green-500" : ""
                          }`}
                        >
                          {formatNumber(entry.squats)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end ml-2 pl-2 border-l border-gray-700">
                      <div className="flex items-center">
                        <span className="text-xs mr-1">🏆</span>
                        <span className="font-bold text-yellow-400">
                          {formatNumber(calculateTotal(entry))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-700 rounded-lg">
            <div className="text-4xl mb-2">🏆</div>
            <p>No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
