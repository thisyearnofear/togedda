"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import { NetworkData } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName } from "@/lib/utils";
import { useNotification } from "@coinbase/onchainkit/minikit";
import Image from "next/image";
import { useEffect, useState } from "react";

interface PersonalDashboardProps {
  networkData: NetworkData;
  isLoading: boolean;
}

interface UserStats {
  totalPushups: number;
  totalSquats: number;
  networkBreakdown: {
    [network: string]: {
      pushups: number;
      squats: number;
    };
  };
  predictions: {
    total: number;
    correct: number;
    pending: number;
    staked: number;
  };
  rank: {
    pushups: number;
    squats: number;
    overall: number;
  };
}

export default function PersonalDashboard({
  networkData,
  isLoading,
}: PersonalDashboardProps) {
  const { user, isSignedIn } = useSignIn({ autoSignIn: false });
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const sendNotification = useNotification();

  // Calculate user stats from network data
  useEffect(() => {
    if (!isLoading && networkData && user) {
      const stats: UserStats = {
        totalPushups: 0,
        totalSquats: 0,
        networkBreakdown: {},
        predictions: {
          total: 0,
          correct: 0,
          pending: 0,
          staked: 0,
        },
        rank: {
          pushups: 0,
          squats: 0,
          overall: 0,
        },
      };

      // Calculate total contributions
      let allUsers: { address: string; pushups: number; squats: number }[] = [];

      Object.entries(networkData).forEach(([network, scores]) => {
        // Initialize network in breakdown if not exists
        if (!stats.networkBreakdown[network]) {
          stats.networkBreakdown[network] = {
            pushups: 0,
            squats: 0,
          };
        }

        // Find user's scores in this network
        const userScore = scores.find(
          (score) =>
            score.user.toLowerCase() === user.custody_address.toLowerCase()
        );

        if (userScore) {
          stats.totalPushups += userScore.pushups;
          stats.totalSquats += userScore.squats;
          stats.networkBreakdown[network].pushups = userScore.pushups;
          stats.networkBreakdown[network].squats = userScore.squats;
        }

        // Collect all users for ranking
        scores.forEach((score) => {
          const existingUser = allUsers.find(
            (u) => u.address.toLowerCase() === score.user.toLowerCase()
          );

          if (existingUser) {
            existingUser.pushups += score.pushups;
            existingUser.squats += score.squats;
          } else {
            allUsers.push({
              address: score.user,
              pushups: score.pushups,
              squats: score.squats,
            });
          }
        });
      });

      // Calculate rankings
      if (allUsers.length > 0) {
        // Sort by pushups
        const pushupsRanking = [...allUsers].sort(
          (a, b) => b.pushups - a.pushups
        );
        const userPushupsRank =
          pushupsRanking.findIndex(
            (u) =>
              u.address.toLowerCase() === user.custody_address.toLowerCase()
          ) + 1;

        // Sort by squats
        const squatsRanking = [...allUsers].sort((a, b) => b.squats - a.squats);
        const userSquatsRank =
          squatsRanking.findIndex(
            (u) =>
              u.address.toLowerCase() === user.custody_address.toLowerCase()
          ) + 1;

        // Sort by total (pushups + squats)
        const totalRanking = [...allUsers].sort(
          (a, b) => b.pushups + b.squats - (a.pushups + a.squats)
        );
        const userTotalRank =
          totalRanking.findIndex(
            (u) =>
              u.address.toLowerCase() === user.custody_address.toLowerCase()
          ) + 1;

        stats.rank = {
          pushups: userPushupsRank || allUsers.length,
          squats: userSquatsRank || allUsers.length,
          overall: userTotalRank || allUsers.length,
        };
      }

      // TODO: Add prediction stats when available
      stats.predictions = {
        total: 5,
        correct: 3,
        pending: 1,
        staked: 120,
      };

      setUserStats(stats);
    }
  }, [networkData, isLoading, user]);

  const generateShareableImage = async () => {
    if (!userStats || !user) return;

    setIsGeneratingImage(true);

    try {
      // This would typically call an API endpoint to generate the image
      // For now, we'll simulate it with a timeout
      setTimeout(() => {
        // In a real implementation, this would be the URL to the generated image
        setShareableImage(`/api/og/user-stats/${user.fid}`);
        setIsGeneratingImage(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to generate shareable image:", error);
      setIsGeneratingImage(false);
    }
  };

  const shareStats = async () => {
    if (!shareableImage) {
      await generateShareableImage();
    }

    // This would typically use the Farcaster SDK to share the image
    // For now, we'll just show a notification
    sendNotification({
      title: "Stats Shared!",
      body: "Your fitness stats have been shared to your Farcaster feed.",
    });
  };

  if (!isSignedIn) {
    return (
      <div className="game-container my-8 text-center">
        <h2 className="retro-heading text-xl mb-6">My Dashboard</h2>
        <p className="mb-4">Sign in to view your personal stats</p>
      </div>
    );
  }

  if (isLoading || !userStats) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">My Dashboard</h2>

      {/* User Profile */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex flex-col items-center">
          <Image
            src={user?.pfp_url || "/placeholder-avatar.png"}
            alt="Profile"
            className="w-20 h-20 rounded-full border-4 border-white mb-2"
            width={80}
            height={80}
          />
          <h3 className="text-lg">{user?.display_name}</h3>
          <p className="text-sm text-gray-400">@{user?.username}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Fitness Stats */}
        <div className="border-2 border-white p-4 rounded-lg">
          <h3 className="text-center mb-4">Fitness Stats</h3>

          <div className="flex justify-between mb-4">
            <div className="text-center">
              <div className="text-pink-500 text-2xl mb-1">
                {formatNumber(userStats.totalPushups)}
              </div>
              <div className="text-xs">Push-ups</div>
            </div>
            <div className="text-center">
              <div className="text-green-500 text-2xl mb-1">
                {formatNumber(userStats.totalSquats)}
              </div>
              <div className="text-xs">Squats</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 text-2xl mb-1">
                {formatNumber(userStats.totalPushups + userStats.totalSquats)}
              </div>
              <div className="text-xs">Total</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs mb-1">Your Rank</div>
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-pink-500">{userStats.rank.pushups}</div>
                <div className="text-xs">Push-ups</div>
              </div>
              <div className="text-center">
                <div className="text-green-500">{userStats.rank.squats}</div>
                <div className="text-xs">Squats</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-500">{userStats.rank.overall}</div>
                <div className="text-xs">Overall</div>
              </div>
            </div>
          </div>
        </div>

        {/* Prediction Stats */}
        <div className="border-2 border-white p-4 rounded-lg">
          <h3 className="text-center mb-4">Prediction Stats</h3>

          <div className="flex justify-between mb-4">
            <div className="text-center">
              <div className="text-blue-500 text-2xl mb-1">
                {userStats.predictions.total}
              </div>
              <div className="text-xs">Total</div>
            </div>
            <div className="text-center">
              <div className="text-green-500 text-2xl mb-1">
                {userStats.predictions.correct}
              </div>
              <div className="text-xs">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 text-2xl mb-1">
                {userStats.predictions.pending}
              </div>
              <div className="text-xs">Pending</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs mb-1">Total Staked</div>
            <div className="text-celo text-xl">
              {userStats.predictions.staked} CELO
            </div>
          </div>
        </div>
      </div>

      {/* Network Breakdown */}
      <div className="mb-8">
        <h3 className="text-center mb-4">Network Breakdown</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(userStats.networkBreakdown).map(
            ([network, stats]) => {
              const networkColor =
                NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] ||
                "white";

              return (
                <div key={network} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: networkColor }}
                  >
                    <span className="text-sm">
                      {network.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm">{getNetworkName(network)}</div>
                  <div className="text-xs text-pink-500">
                    {formatNumber(stats.pushups)} 💪
                  </div>
                  <div className="text-xs text-green-500">
                    {formatNumber(stats.squats)} 🏃
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Share Stats */}
      <div className="text-center">
        <button
          className="retro-button pulse-animation"
          onClick={shareStats}
          disabled={isGeneratingImage}
        >
          {isGeneratingImage ? "Generating..." : "Share My Stats 🚀"}
        </button>

        {shareableImage && (
          <div className="mt-4">
            <p className="text-sm mb-2">Your shareable stats image is ready!</p>
            <div className="border-2 border-white p-2 rounded-lg">
              <Image
                src={shareableImage}
                alt="Shareable Stats"
                width={300}
                height={157}
                className="mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
