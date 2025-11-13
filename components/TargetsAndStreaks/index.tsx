"use client";

import { useAppUser } from "@/contexts/unified-app-context";
import { useFitnessStreaks } from "@/hooks/use-fitness-streaks";
import { NetworkData } from "@/lib/blockchain";
import { useEffect, useState } from "react";
import {
  FaFire,
  FaMedal,
  FaTrophy,
  FaShare,
  FaCalendarCheck,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import Confetti from "@/components/Confetti";
import { useNotification } from "@coinbase/onchainkit/minikit";

interface TargetsAndStreaksProps {
  networkData: NetworkData;
  isLoading: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  target: number;
  completed: boolean;
  type: "daily" | "weekly" | "milestone" | "streak";
  network?: string;
}

export default function TargetsAndStreaks({
  networkData,
  isLoading,
}: TargetsAndStreaksProps) {
  const { user, isAuthenticated: isSignedIn } = useAppUser();
  const {
    streakData,
    isLoading: streaksLoading,
    syncFitnessData,
  } = useFitnessStreaks();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const sendNotification = useNotification();

  // Sync fitness data when component mounts
  useEffect(() => {
    if (user?.fid) {
      syncFitnessData(user.fid);
    }
  }, [user?.fid, syncFitnessData]); // Include syncFitnessData dependency

  // Calculate user's achievements based on network data and streak data
  useEffect(() => {
    if (!isLoading && !streaksLoading && networkData && user) {
      // Find user's total contributions
      let totalPushups = 0;
      let totalSquats = 0;
      let streakDays = streakData?.currentStreak || 0;
      let longestStreak = streakData?.longestStreak || 0;
      let hasContributedToday =
        streakData?.activityDates?.includes(
          new Date().toISOString().split("T")[0]
        ) || false;

      // Calculate total contributions from network data
      Object.entries(networkData).forEach(([network, scores]) => {
        // Find user's scores in this network
        const userScore = scores.find(
          (score) =>
            user.custody_address &&
            score.user.toLowerCase() === user.custody_address.toLowerCase()
        );

        if (userScore) {
          totalPushups += userScore.pushups;
          totalSquats += userScore.squats;
        }
      });

      // Create achievements list
      const userAchievements: Achievement[] = [
        {
          id: "pushup-100",
          title: "Push-up Century",
          description: "Complete 100 push-ups in total",
          icon: <FaMedal className="text-yellow-400" size={24} />,
          progress: totalPushups,
          target: 100,
          completed: totalPushups >= 100,
          type: "milestone",
        },
        {
          id: "squat-100",
          title: "Squat Master",
          description: "Complete 100 squats in total",
          icon: <FaMedal className="text-yellow-400" size={24} />,
          progress: totalSquats,
          target: 100,
          completed: totalSquats >= 100,
          type: "milestone",
        },
        {
          id: "daily-contribution",
          title: "Daily Discipline",
          description: "Contribute today to maintain your streak",
          icon: <FaCalendarCheck className="text-orange-500" size={24} />,
          progress: hasContributedToday ? 1 : 0,
          target: 1,
          completed: hasContributedToday,
          type: "daily",
        },
        {
          id: "streak-3",
          title: "3-Day Streak",
          description: "Exercise for 3 consecutive days",
          icon: <FaFire className="text-orange-500" size={24} />,
          progress: streakDays,
          target: 3,
          completed: streakDays >= 3,
          type: "streak",
        },
        {
          id: "streak-7",
          title: "7-Day Streak",
          description: "Exercise for 7 consecutive days",
          icon: <FaFire className="text-red-500" size={24} />,
          progress: streakDays,
          target: 7,
          completed: streakDays >= 7,
          type: "streak",
        },
        {
          id: "streak-30",
          title: "30-Day Streak",
          description: "Exercise for 30 consecutive days",
          icon: <FaFire className="text-purple-500" size={24} />,
          progress: streakDays,
          target: 30,
          completed: streakDays >= 30,
          type: "streak",
        },
        {
          id: "celo-contributor",
          title: "Celo Champion",
          description: "Contribute to the Celo network",
          icon: <span className="text-2xl">🟡</span>,
          progress: 1,
          target: 1,
          completed: true,
          type: "milestone",
          network: "celo",
        },
        {
          id: "all-networks",
          title: "Network Explorer",
          description: "Contribute to all 4 networks",
          icon: <FaTrophy className="text-purple-400" size={24} />,
          progress: 2,
          target: 4,
          completed: false,
          type: "milestone",
        },
      ];

      setAchievements(userAchievements);
    }
  }, [networkData, isLoading, user, streakData, streaksLoading]);

  const shareAchievement = async (achievement: Achievement) => {
    try {
      // Import the SDK dynamically to avoid SSR issues
      const { sdk } = await import("@farcaster/frame-sdk");
      const appUrl = process.env.NEXT_PUBLIC_URL || "https://imperfectform.fun";

      // Create a more engaging message
      let emoji = "🏆";
      if (achievement.type === "streak") emoji = "🔥";
      if (achievement.type === "daily") emoji = "✅";
      if (achievement.network === "celo") emoji = "🟡";
      if (achievement.network === "polygon") emoji = "🟣";
      if (achievement.network === "base") emoji = "🔵";
      if (achievement.network === "monad") emoji = "⚫";

      const castText = `${emoji} Achievement Unlocked: ${achievement.title}!\n\n${achievement.description}\n\n#Togedda #ImperfectForm #StayHard`;

      // Share to Farcaster
      await sdk.actions.composeCast({
        text: castText,
        embeds: [`${appUrl}/achievements/${achievement.id}`],
      });

      // Show success feedback
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      sendNotification({
        title: "Achievement Shared!",
        body: "Your achievement has been shared to your Farcaster feed.",
      });
    } catch (error) {
      console.error("Error sharing achievement:", error);
      toast.error("Failed to share. Please try again.");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="game-container my-8">
      <Confetti active={showConfetti} />

      <h2 className="retro-heading text-xl mb-6">Targets & Streaks</h2>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`border-2 ${
              achievement.completed
                ? "border-yellow-500 bg-yellow-900 bg-opacity-20"
                : "border-gray-700"
            } p-4 rounded-lg relative`}
            onClick={() => setSelectedAchievement(achievement)}
          >
            {/* Achievement Badge */}
            <div className="flex items-center mb-3">
              <div className="mr-3">{achievement.icon}</div>
              <div>
                <h3 className="font-bold">{achievement.title}</h3>
                <p className="text-xs text-gray-400">
                  {achievement.description}
                </p>
              </div>
              {achievement.completed && (
                <div className="absolute top-2 right-2 text-yellow-500 animate-pulse">
                  ✓
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${
                  achievement.completed ? "bg-yellow-500" : "bg-blue-600"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (achievement.progress / achievement.target) * 100
                  )}%`,
                }}
              ></div>
            </div>

            {/* Progress Text */}
            <div className="flex justify-between text-xs">
              <span>
                {achievement.progress} / {achievement.target}
              </span>
              <span>
                {Math.min(
                  100,
                  Math.floor((achievement.progress / achievement.target) * 100)
                )}
                %
              </span>
            </div>

            {/* Share Button (only for completed achievements) */}
            {achievement.completed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  shareAchievement(achievement);
                }}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center justify-center"
              >
                <FaShare className="mr-2" /> Share Achievement
              </button>
            )}
          </div>
        ))}
      </div>

      {/* NFT/POAP Info */}
      <div className="border-2 border-purple-700 p-4 rounded-lg bg-purple-900 bg-opacity-20 mb-6">
        <h3 className="text-center text-purple-400 mb-2">
          NFT Rewards Coming Soon!
        </h3>
        <p className="text-sm text-center mb-2">
          Complete achievements to earn exclusive NFTs and POAPs
        </p>
        <div className="flex justify-center space-x-4 mb-2">
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            🏆
          </div>
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            🔥
          </div>
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
            💪
          </div>
        </div>
        <p className="text-xs text-center text-gray-400">
          Achievements will be permanently recorded on-chain
        </p>
      </div>

      {/* Motivational Footer */}
      <div className="text-center mt-6">
        <p className="text-xs text-yellow-400 glow-text">STAY HARD</p>
        <p className="text-xs text-gray-400 mt-2">Every achievement matters</p>
      </div>
    </div>
  );
}
