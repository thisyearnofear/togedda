"use client";

import { NetworkData, Score } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName, truncateAddress } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import Web3Profile from "@/components/Web3Profile";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { fetchFollows } from "@/lib/farcaster-social";
import { FarcasterProfile } from "@/lib/farcaster-profiles";

import { useLeaderboardAddresses } from "@/hooks/use-address-resolution";
import { FaShare, FaUserFriends } from "react-icons/fa";
import { toast } from "react-hot-toast";
import Confetti from "@/components/Confetti";

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
  const { context } = useMiniKit();
  const [sortBy, setSortBy] = useState<"pushups" | "squats">("pushups");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);
  const [followFids, setFollowFids] = useState<number[]>([]);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  // Get unique addresses for unified resolution
  const uniqueAddresses = data
    ? Array.from(
        new Set(
          Object.values(data).flatMap((scores) =>
            scores.map((score) => score.user.toLowerCase())
          )
        )
      ).slice(0, 50)
    : []; // Limit to top 50 for performance

  // Use new unified resolution system only
  const {
    getDisplayNameForAddress,
    getProfileForAddress,
    isLoading: unifiedLoading,
    resolved: resolvedCount,
    total: totalAddresses,
  } = useLeaderboardAddresses(uniqueAddresses);

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
  const getEntries = useCallback((): Score[] => {
    if (selectedNetwork === "all") {
      // Combine all networks
      return Object.values(data).flat();
    } else {
      // Return specific network
      return data[selectedNetwork] || [];
    }
  }, [data, selectedNetwork]);

  // Apply filters (friends only if selected) - wrapped in useCallback to avoid dependency changes
  const getFilteredEntries = useCallback((): Score[] => {
    const entries = getEntries();

    if (!showOnlyFriends || followFids.length === 0) {
      return entries;
    }

    // This is a simplified approach - in a real app, you'd need to map addresses to FIDs
    // For demo purposes, we'll just filter based on the first few characters matching
    return entries.filter((entry) => {
      // Check if any of the user's follows has an address that starts with the same characters
      return followFids.some(
        (fid) =>
          entry.user.toLowerCase().substring(0, 5) ===
          fid.toString().substring(0, 5)
      );
    });
  }, [getEntries, showOnlyFriends, followFids]);

  // Fetch follows when user FID is available
  useEffect(() => {
    const loadUserData = async () => {
      if (context?.user?.fid) {
        try {
          // Set user FID
          setUserFid(context.user.fid);

          // Fetch follows
          const follows = await fetchFollows(context.user.fid);
          setFollowFids(follows);

          // Find user's position in leaderboard
          const allEntries = getEntries();
          const sortedByTotal = [...allEntries].sort(
            (a, b) => b.pushups + b.squats - (a.pushups + a.squats)
          );

          // For demo purposes, we'll just set a random position
          // In a real app, you'd need to match the user's wallet address with entries
          if (sortedByTotal.length > 0) {
            // Randomly assign a position for demo purposes
            const demoPosition = Math.floor(Math.random() * 5) + 1;
            setUserPosition(demoPosition);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };

    loadUserData();
  }, [context?.user, getEntries]);

  // Address resolution is now handled automatically by the unified system in Web3Profile components

  // Share leaderboard position
  const shareLeaderboardPosition = async () => {
    try {
      if (!userPosition) return;

      const { sdk } = await import("@farcaster/frame-sdk");
      const appUrl = process.env.NEXT_PUBLIC_URL || "https://imperfectform.fun";

      // Create a more engaging message
      const networkText =
        selectedNetwork === "all" ? "Global" : getNetworkName(selectedNetwork);
      const position =
        userPosition <= 3
          ? ["🥇 First", "🥈 Second", "🥉 Third"][userPosition - 1]
          : `#${userPosition}`;

      const castText = `I'm ranked ${position} on the ${networkText} Leaderboard on Imperfect Form! 💪\n\n#ImperfectForm #StayHard`;

      // Share to Farcaster
      await sdk.actions.composeCast({
        text: castText,
        embeds: [`${appUrl}/leaderboard`],
      });

      // Show success feedback
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      toast.success("Shared to Farcaster!");
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      toast.error("Failed to share. Please try again.");
    }
  };

  // Calculate total contributions for each user
  const calculateTotal = (entry: Score) => entry.pushups + entry.squats;

  // Sort entries
  const sortedEntries = getFilteredEntries().sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (sortOrder === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-sm text-gray-400">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="game-container my-8 relative">
      {/* Confetti animation */}
      <Confetti active={showConfetti} />

      <div className="flex justify-between items-center mb-6">
        <h2 className="retro-heading text-xl">
          {selectedNetwork === "all"
            ? "Global Leaderboard"
            : `${getNetworkName(selectedNetwork)} Leaderboard`}
        </h2>

        {/* Share position button */}
        {userPosition && (
          <button
            onClick={shareLeaderboardPosition}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
          >
            <FaShare className="mr-2" />
            Share My Position
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex">
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

        {/* Friends filter toggle */}
        <div
          className={`flex items-center px-3 py-1 rounded-lg cursor-pointer ${
            showOnlyFriends ? "bg-blue-600" : "bg-gray-700"
          }`}
          onClick={() => setShowOnlyFriends(!showOnlyFriends)}
        >
          <FaUserFriends className="mr-2" />
          <span>Show Follows</span>
        </div>
      </div>

      {/* User position indicator */}
      {userPosition && (
        <div className="bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-lg p-3 mb-4 text-center">
          <p>
            You&apos;re ranked{" "}
            <span className="font-bold text-yellow-400">#{userPosition}</span>{" "}
            on the{" "}
            {selectedNetwork === "all"
              ? "Global"
              : getNetworkName(selectedNetwork)}{" "}
            Leaderboard!
          </p>
        </div>
      )}

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        {sortedEntries.length > 0 ? (
          <div className="space-y-4 px-4 sm:px-0">
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

              // Check if this entry is from a followed user (simplified for demo)
              const isFollowed = followFids.some(
                (fid) =>
                  entry.user.toLowerCase().substring(0, 5) ===
                  fid.toString().substring(0, 5)
              );

              return (
                <div
                  key={`${entry.user}-${index}`}
                  className={`flex flex-wrap items-center p-3 rounded-lg border ${
                    isFollowed ? "border-blue-500" : "border-gray-700"
                  } ${rowClass} transition-colors leaderboard-item ${
                    isFollowed ? "bg-blue-900 bg-opacity-20" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${medalClass} mr-3`}
                  >
                    {medalEmoji || index + 1}
                  </div>

                  <div className="flex-1 flex items-center min-w-0 overflow-hidden">
                    <Web3Profile
                      address={entry.user}
                      useUnifiedResolution={true}
                      className="truncate max-w-full"
                    />
                    {isFollowed && (
                      <span className="ml-2 text-blue-400 text-xs bg-blue-900 bg-opacity-30 px-2 py-1 rounded whitespace-nowrap">
                        <FaUserFriends className="inline mr-1" /> Follow
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <span className="text-xs mr-1">💪</span>
                        <span
                          className={`font-bold text-sm sm:text-base ${
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
                          className={`font-bold text-sm sm:text-base ${
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
                        <span className="font-bold text-sm sm:text-base text-yellow-400">
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
