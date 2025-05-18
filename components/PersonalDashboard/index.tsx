"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import { useStreaks } from "@/hooks/use-streaks";
import { NetworkData } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName } from "@/lib/utils";
import { useNotification } from "@coinbase/onchainkit/minikit";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import TargetsAndStreaks from "@/components/TargetsAndStreaks";
import Confetti from "@/components/Confetti";
import { toast } from "react-hot-toast";
import { addressToFid } from "@/lib/farcaster-social";
import {
  FaShare,
  FaArrowRight,
  FaFire,
  FaTrophy,
  FaMedal,
} from "react-icons/fa";

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
  const {
    streakData,
    isLoading: streaksLoading,
    updateStreak,
  } = useStreaks(user?.fid || null);
  // Use useMemo to prevent unnecessary rerenders when setting userStats
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  // Use a ref to track if we've already calculated stats to prevent multiple calculations
  const statsCalculatedRef = useRef<boolean>(false);
  const [shareableImage, setShareableImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showTargetsAndStreaks, setShowTargetsAndStreaks] = useState(false);
  const sendNotification = useNotification();

  // Update streak when component mounts - only once
  useEffect(() => {
    if (user?.fid) {
      // Reset the stats calculated flag when the user changes
      statsCalculatedRef.current = false;

      // Use a ref to track if we've already updated the streak
      const streakUpdateTimeout = setTimeout(() => {
        updateStreak();
      }, 1000); // Add a small delay to avoid immediate API calls

      return () => clearTimeout(streakUpdateTimeout);
    }
  }, [user?.fid]); // Remove updateStreak from dependencies

  // Define calculateStats function with useCallback and memoize expensive calculations
  const calculateStats = useCallback(async () => {
    // Only run if we have the necessary data and aren't already loading
    if (isLoading || !networkData || !user) return;

    // Create a new stats object
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

    // Get connected addresses from Farcaster
    let connectedAddresses: string[] = [];

    try {
      // First, add the custody address
      if (user.custody_address) {
        connectedAddresses.push(user.custody_address.toLowerCase());
      }

      // Then try to get verified addresses from Neynar API
      const response = await fetch(
        `/api/farcaster/user?fid=${user.fid}&include_verifications=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (
          data.users &&
          data.users.length > 0 &&
          data.users[0].verifications
        ) {
          // Add verified addresses
          data.users[0].verifications.forEach((address: string) => {
            if (!connectedAddresses.includes(address.toLowerCase())) {
              connectedAddresses.push(address.toLowerCase());
            }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching connected addresses:", error);
    }

    console.log("Connected addresses:", connectedAddresses);

    // Process each network sequentially to avoid too many API calls at once
    for (const [network, scores] of Object.entries(networkData) as [
      string,
      any[]
    ][]) {
      // Initialize network in breakdown if not exists
      if (!stats.networkBreakdown[network]) {
        stats.networkBreakdown[network] = {
          pushups: 0,
          squats: 0,
        };
      }

      // Check all connected addresses for scores
      for (const address of connectedAddresses) {
        const addressScore = scores.find(
          (score: any) => score.user.toLowerCase() === address
        );

        if (addressScore) {
          stats.totalPushups += addressScore.pushups;
          stats.totalSquats += addressScore.squats;
          stats.networkBreakdown[network].pushups += addressScore.pushups;
          stats.networkBreakdown[network].squats += addressScore.squats;
          console.log(
            `Found score for address ${address} in network ${network}`
          );
        }
      }

      // Collect all users for ranking
      scores.forEach((score: any) => {
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
    } // End of for loop

    // Calculate rankings
    if (allUsers.length > 0) {
      // Sort by pushups
      const pushupsRanking = [...allUsers].sort(
        (a, b) => b.pushups - a.pushups
      );
      const userPushupsRank =
        pushupsRanking.findIndex(
          (u) => u.address.toLowerCase() === user.custody_address.toLowerCase()
        ) + 1;

      // Sort by squats
      const squatsRanking = [...allUsers].sort((a, b) => b.squats - a.squats);
      const userSquatsRank =
        squatsRanking.findIndex(
          (u) => u.address.toLowerCase() === user.custody_address.toLowerCase()
        ) + 1;

      // Sort by total (pushups + squats)
      const totalRanking = [...allUsers].sort(
        (a, b) => b.pushups + b.squats - (a.pushups + a.squats)
      );
      const userTotalRank =
        totalRanking.findIndex(
          (u) => u.address.toLowerCase() === user.custody_address.toLowerCase()
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
  }, [isLoading, networkData, user]);

  // Call calculateStats when dependencies change, with debounce to prevent excessive calls
  useEffect(() => {
    // Skip if we don't have the necessary data
    if (isLoading || !networkData || !user) return;

    // Skip if we've already calculated stats and have data
    if (statsCalculatedRef.current && userStats) return;

    // Use a timeout to debounce multiple rapid changes
    const statsTimeout = setTimeout(() => {
      calculateStats();
      // Mark stats as calculated
      statsCalculatedRef.current = true;
    }, 500);

    // Clean up the timeout if dependencies change before it fires
    return () => clearTimeout(statsTimeout);
  }, [isLoading, networkData, user, userStats]); // Add userStats to dependencies

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

      // Include streak information if available
      let streakInfo = "";
      if (streakData && streakData.currentStreak > 0) {
        streakInfo = `\n🔥 ${streakData.currentStreak}-day streak`;
        if (streakData.currentStreak >= 7) {
          streakInfo += " (Achievement unlocked!)";
        }
      }

      const castText = `My fitness stats on Imperfect Form:\n\n${
        userStats?.totalPushups || 0
      } Push-ups\n${
        userStats?.totalSquats || 0
      } Squats\n${totalExercises} Total${streakInfo}\n\nStay Hard! 💪`;

      // Share to Farcaster using composeCast
      await sdk.actions.composeCast({
        text: castText,
        // The Farcaster SDK expects embeds to be an array of strings (URLs)
        embeds: [`${appUrl}/user-stats/${user?.fid}`],
      });

      // Show confetti animation
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      sendNotification({
        title: "Stats Shared!",
        body: "Your fitness stats have been shared to your Farcaster feed.",
      });
    } catch (error) {
      console.error("Error sharing to Farcaster:", error);

      // Check if it's a user rejection error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("rejected") ||
        errorMessage.includes("denied")
      ) {
        // User rejected the action - show a more specific message
        toast.error("Sharing cancelled by user");
      } else {
        // Other error - show a generic message
        sendNotification({
          title: "Sharing Failed",
          body: "Could not share your stats. Please try again.",
        });
      }
    }
  };

  // Show loading state if either auth, data, or streaks are loading
  if (authLoading || isLoading || streaksLoading) {
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
        <p className="text-xs text-gray-400">Beauty is imperfect</p>
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
      {/* Confetti animation */}
      <Confetti active={showConfetti} />

      <div className="flex justify-center items-center mb-6">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded-lg text-sm ${
              !showTargetsAndStreaks ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setShowTargetsAndStreaks(false)}
          >
            Stats
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm ${
              showTargetsAndStreaks ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setShowTargetsAndStreaks(true)}
          >
            Targets & Streaks
          </button>
        </div>
      </div>

      {!showTargetsAndStreaks ? (
        <>
          {/* User Profile with Welcome Message for New Users */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex flex-col items-center">
              <Image
                src={user?.pfp_url || "/placeholder-avatar.png"}
                alt="Profile"
                className="w-16 h-16 rounded-full border-4 border-white mb-2"
                width={64}
                height={64}
              />
              <h3 className="text-lg">{user?.display_name}</h3>
              <p className="text-sm text-gray-400">@{user?.username}</p>
              {isNewUser && (
                <div className="mt-1 text-xs pulse-animation">
                  <span className="text-pink-500">GM</span> •{" "}
                </div>
              )}
            </div>
          </div>

          {/* Compact Streak Display */}
          {streakData && streakData.currentStreak > 0 && (
            <div className="flex items-center justify-between p-3 border-2 border-yellow-500 rounded-lg mb-4 bg-yellow-900 bg-opacity-10">
              <div className="flex items-center">
                <FaFire className="text-red-500 mr-2" size={20} />
                <div>
                  <span className="font-bold">
                    {streakData.currentStreak}-day streak
                  </span>
                  {streakData.currentStreak >= 7 && (
                    <span className="ml-2 text-yellow-400 text-xs">
                      <FaMedal className="inline-block mr-1" />
                      Achievement!
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-xs text-gray-400 mr-2">
                  Best:{" "}
                  <span className="text-yellow-400">
                    {streakData.longestStreak}d
                  </span>
                </span>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                  onClick={() => {
                    updateStreak();
                    toast.success("Streak updated!");
                  }}
                >
                  Update
                </button>
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
                    <div className="text-center flex-1">
                      <div className="text-pink-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Push-ups</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-green-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Squats</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-yellow-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Total</div>
                    </div>
                  </div>
                  <div className="text-xs mb-4 border-t border-gray-700 pt-4">
                    <p className="mb-2">
                      Get fit, have fun, raise dosh for good causes at{" "}
                      <span className="text-yellow-400">imperfectform.fun</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Contributions appear here automatically
                    </p>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    &ldquo;Chase perfection, catch greatness.&rdquo;
                  </div>
                  <div className="text-xs text-pink-500 pulse-animation">
                    Every rep counts
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between mb-4">
                    <div className="text-center flex-1">
                      <div className="text-pink-500 text-xl sm:text-2xl mb-1">
                        {formatNumber(userStats.totalPushups)}
                      </div>
                      <div className="text-xs">Push-ups</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-green-500 text-xl sm:text-2xl mb-1">
                        {formatNumber(userStats.totalSquats)}
                      </div>
                      <div className="text-xs">Squats</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-yellow-500 text-xl sm:text-2xl mb-1">
                        {formatNumber(
                          userStats.totalPushups + userStats.totalSquats
                        )}
                      </div>
                      <div className="text-xs">Total</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs mb-1">Your Rank</div>
                    <div className="flex justify-center space-x-2 sm:space-x-4">
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
                    <div className="text-center flex-1">
                      <div className="text-blue-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Total</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-green-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Correct</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-yellow-500 text-xl sm:text-2xl mb-1">
                        0
                      </div>
                      <div className="text-xs">Pending</div>
                    </div>
                  </div>
                  <div className="text-xs mb-4 border-t border-gray-700 pt-4">
                    <p className="mb-2">
                      Stake CELO on fitness challenges in the{" "}
                      <span className="text-yellow-400">Predictions</span> tab
                    </p>
                    <p className="text-xs text-gray-400">
                      15% of all stakes go to charity, 80% to the winning
                      predictors
                    </p>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    &ldquo;Health + wellness = good times.&rdquo;
                  </div>
                  <div className="text-xs text-celo pulse-animation">
                    Do well for you, do good for others
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between mb-4">
                    <div className="text-center flex-1">
                      <div className="text-blue-500 text-xl sm:text-2xl mb-1">
                        {userStats.predictions.total}
                      </div>
                      <div className="text-xs">Total</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-green-500 text-xl sm:text-2xl mb-1">
                        {userStats.predictions.correct}
                      </div>
                      <div className="text-xs">Correct</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-yellow-500 text-xl sm:text-2xl mb-1">
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
        </>
      ) : (
        <TargetsAndStreaks networkData={networkData} isLoading={isLoading} />
      )}

      {/* Compact Share Stats or Call to Action */}
      <div className="text-center">
        {isNewUser ? (
          <div className="mb-4">
            <div className="border border-gray-700 p-3 rounded-lg mb-3 text-xs">
              <p className="mb-1">
                15% of all predictions go to{" "}
                <a
                  href="https://explorer.gitcoin.co/#/round/42220/31/57"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline"
                >
                  Greenpill Kenya
                </a>
              </p>
              <button
                className="text-celo text-xs underline"
                onClick={() =>
                  window.open("https://warpcast.com/greenpillnetwork", "_blank")
                }
              >
                Follow @greenpillnetwork 🌱
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center mb-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm flex items-center"
              onClick={shareStats}
              disabled={isGeneratingImage}
            >
              <FaShare className="mr-2" />
              {isGeneratingImage ? "Generating..." : "Share Stats"}
            </button>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const predictionsTab = document.querySelector(
                    'button[class*="retro-button"][class*="scale-105"]'
                  );
                  if (predictionsTab) {
                    (predictionsTab as HTMLButtonElement).click();
                  }
                }}
                className="text-xs flex items-center text-blue-400 border border-gray-700 rounded px-2 py-1"
              >
                Predictions <FaArrowRight className="ml-1" size={10} />
              </button>

              <button
                onClick={() => {
                  const leaderboardTab = document.querySelector(
                    'button[class*="retro-button"]:nth-child(2)'
                  );
                  if (leaderboardTab) {
                    (leaderboardTab as HTMLButtonElement).click();
                  }
                }}
                className="text-xs flex items-center text-blue-400 border border-gray-700 rounded px-2 py-1"
              >
                Leaderboard <FaArrowRight className="ml-1" size={10} />
              </button>
            </div>
          </div>
        )}

        {shareableImage && (
          <div className="mb-4 border border-gray-700 p-2 rounded-lg">
            <Image
              src={shareableImage}
              alt="Shareable Stats"
              width={250}
              height={131}
              className="mx-auto"
            />
          </div>
        )}
      </div>

      {/* Compact Motivational Footer */}
      <div className="text-center mt-3 border-t border-gray-800 pt-2">
        <p className="text-xs text-yellow-400 glow-text">
          GN • <span className="text-gray-400">imperfect form</span>
        </p>
      </div>
    </div>
  );
}
