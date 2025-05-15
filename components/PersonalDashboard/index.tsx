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
  // Use autoSignIn: true to automatically sign in with Farcaster
  const {
    user,
    isSignedIn,
    isLoading: authLoading,
  } = useSignIn({ autoSignIn: true });
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

    try {
      // Import the SDK dynamically to avoid SSR issues
      const { sdk } = await import("@farcaster/frame-sdk");
      const appUrl = process.env.NEXT_PUBLIC_URL || "https://imperfectform.fun";

      // Create a cast with the stats information
      const totalExercises = userStats
        ? userStats.totalPushups + userStats.totalSquats
        : 0;
      const castText = `My fitness stats on Imperfect Form:\n\n${
        userStats?.totalPushups || 0
      } Push-ups\n${
        userStats?.totalSquats || 0
      } Squats\n${totalExercises} Total\n\nStay Hard! 💪`;

      // Share to Farcaster using composeCast
      await sdk.actions.composeCast({
        text: castText,
        // The Farcaster SDK expects embeds to be an array of strings (URLs)
        embeds: [`${appUrl}/user-stats/${user?.fid}`],
      });

      sendNotification({
        title: "Stats Shared!",
        body: "Your fitness stats have been shared to your Farcaster feed.",
      });
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);
      sendNotification({
        title: "Sharing Failed",
        body: "Could not share your stats. Please try again.",
      });
    }
  };

  // Show loading state if either auth or data is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // If not signed in after loading completes, show sign-in prompt
  if (!isSignedIn) {
    return (
      <div className="game-container my-8 text-center">
        <h2 className="retro-heading text-xl mb-6">My Dashboard</h2>
        <p className="mb-4">Connecting to Farcaster...</p>
        <p className="text-xs text-gray-400">Beauty is imperfection</p>
      </div>
    );
  }

  // Initialize default stats for new users
  if (!userStats) {
    const emptyStats: UserStats = {
      totalPushups: 0,
      totalSquats: 0,
      networkBreakdown: {
        celo: { pushups: 0, squats: 0 },
        polygon: { pushups: 0, squats: 0 },
        base: { pushups: 0, squats: 0 },
        monad: { pushups: 0, squats: 0 },
      },
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
    setUserStats(emptyStats);
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Check if user is new (has no contributions)
  const isNewUser = userStats.totalPushups === 0 && userStats.totalSquats === 0;

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">My Dashboard</h2>

      {/* User Profile */}
      <div className="flex items-center justify-center mb-6">
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

      {/* Welcome Message for New Users */}
      {isNewUser && (
        <div className="border-2 border-white p-4 rounded-lg mb-6 animate-fadeIn">
          <h3 className="text-center mb-2 text-yellow-400 glow-text">
            WELCOME RECRUIT!
          </h3>
          <p className="text-center text-sm mb-4">
            You&apos;re now part of a global onchain fitness movement
          </p>
          <div className="text-center text-sm mb-3">
            <span className="text-gray-300">
              Beauty is imperfect. Progress is imperfect.
            </span>
          </div>
          <div className="text-center text-xs mb-2 pulse-animation">
            <span className="text-pink-500">STAY HARD</span> •{" "}
            <span className="text-green-500">CARRY THE BOATS</span>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Fitness Stats */}
        <div className="border-2 border-white p-4 rounded-lg">
          <h3 className="text-center mb-4">Fitness Stats</h3>

          {isNewUser ? (
            <div className="text-center mb-4">
              <div className="flex justify-between mb-4">
                <div className="text-center">
                  <div className="text-pink-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Push-ups</div>
                </div>
                <div className="text-center">
                  <div className="text-green-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Squats</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Total</div>
                </div>
              </div>
              <div className="text-xs mb-4 border-t border-gray-700 pt-4">
                <p className="mb-2">
                  Start your fitness journey at{" "}
                  <span className="text-yellow-400">imperfectform.fun</span>
                </p>
                <p className="text-xs text-gray-400">
                  Your contributions appear here automatically
                </p>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                &ldquo;Chase perfection, catch excellence.&rdquo;
              </div>
              <div className="text-xs text-pink-500 pulse-animation">
                Every rep matters
              </div>
            </div>
          ) : (
            <>
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
                    {formatNumber(
                      userStats.totalPushups + userStats.totalSquats
                    )}
                  </div>
                  <div className="text-xs">Total</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs mb-1">Your Rank</div>
                <div className="flex justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-pink-500">
                      {userStats.rank.pushups || "-"}
                    </div>
                    <div className="text-xs">Push-ups</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-500">
                      {userStats.rank.squats || "-"}
                    </div>
                    <div className="text-xs">Squats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-500">
                      {userStats.rank.overall || "-"}
                    </div>
                    <div className="text-xs">Overall</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Prediction Stats */}
        <div className="border-2 border-white p-4 rounded-lg">
          <h3 className="text-center mb-4">Prediction Stats</h3>

          {isNewUser || userStats.predictions.total === 0 ? (
            <div className="text-center mb-4">
              <div className="flex justify-between mb-4">
                <div className="text-center">
                  <div className="text-blue-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-green-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-500 text-2xl mb-1">0</div>
                  <div className="text-xs">Pending</div>
                </div>
              </div>
              <div className="text-xs mb-4 border-t border-gray-700 pt-4">
                <p className="mb-2">
                  Stake CELO on fitness challenges in the{" "}
                  <span className="text-yellow-400">Predictions</span> tab
                </p>
                <p className="text-xs text-gray-400">
                  15% of all stakes go to charity, 80% to the winning predictors
                </p>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                &ldquo;Health + wellness = respect the pamp.&rdquo;
              </div>
              <div className="text-xs text-celo pulse-animation">
                We can do well for ourselves by doing good for others
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Network Breakdown */}
      <div className="mb-8">
        <h3 className="text-center mb-4">Network Breakdown</h3>

        {isNewUser ? (
          <div className="border-2 border-white p-4 rounded-lg text-center">
            <p className="text-sm mb-4">
              Your fitness contributions will be tracked across these networks:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(NETWORK_COLORS).map(([network, color]) => {
                // Network-specific emojis
                let networkEmoji = "🔗";
                if (network === "polygon") networkEmoji = "🟣";
                if (network === "celo") networkEmoji = "🟡";
                if (network === "base") networkEmoji = "🔵";
                if (network === "monad") networkEmoji = "⚫";

                return (
                  <div key={network} className="text-center">
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-sm">{networkEmoji}</span>
                    </div>
                    <div className="text-sm">{getNetworkName(network)}</div>
                    <div className="text-xs text-gray-400">Waiting...</div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs mt-4 text-gray-400">
              Each network has unique challenges and rewards
            </div>
            <div className="text-xs mt-2 text-gray-300 italic">
              &ldquo;Journey. A thousand miles. First step
              (squat/pushup).&rdquo;
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(userStats.networkBreakdown).map(
              ([network, stats]) => {
                const networkColor =
                  NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] ||
                  "white";

                // Network-specific emojis
                let networkEmoji = "🔗";
                if (network === "polygon") networkEmoji = "🟣";
                if (network === "celo") networkEmoji = "🟡";
                if (network === "base") networkEmoji = "🔵";
                if (network === "monad") networkEmoji = "⚫";

                return (
                  <div key={network} className="text-center">
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: networkColor }}
                    >
                      <span className="text-sm">{networkEmoji}</span>
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
        )}
      </div>

      {/* Share Stats or Call to Action */}
      <div className="text-center">
        {isNewUser ? (
          <div className="mb-6">
            <div className="border-2 border-white p-4 rounded-lg mb-4">
              <h3 className="text-center mb-2 text-yellow-400">
                IMPACT TRACKER
              </h3>
              <p className="text-xs mb-2">
                15% of all prediction stakes go to{" "}
                <a
                  href="https://explorer.gitcoin.co/#/round/42220/31/57"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline"
                >
                  Greenpill Kenya
                </a>
              </p>
              <div className="text-center text-xs text-gray-400">
                A network-society that exports regenerative digital
                infrastructure to the world
              </div>
            </div>
            <button
              className="retro-button retro-button-celo"
              onClick={() =>
                window.open("https://warpcast.com/greenpillnetwork", "_blank")
              }
            >
              Follow @greenpillnetwork 🌱
            </button>
          </div>
        ) : (
          <>
            <button
              className="retro-button pulse-animation"
              onClick={shareStats}
              disabled={isGeneratingImage}
            >
              {isGeneratingImage ? "Generating..." : "Share My Stats 🚀"}
            </button>

            {shareableImage && (
              <div className="mt-4">
                <p className="text-sm mb-2">
                  Your shareable stats image is ready!
                </p>
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
          </>
        )}
      </div>

      {/* Motivational Footer */}
      <div className="text-center mt-6 border-t border-gray-800 pt-4">
        <p className="text-xs text-yellow-400 glow-text">STAY HARD</p>
        <p className="text-xs text-gray-400 mt-2">(proudly) imperfect form</p>
      </div>
    </div>
  );
}
