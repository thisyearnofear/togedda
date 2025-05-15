"use client";

import { CollectiveGoals } from "@/lib/blockchain";
import { formatNumber } from "@/lib/utils";
import { useEffect, useState } from "react";

interface CollectiveGoalsProps {
  goals: CollectiveGoals;
  isLoading: boolean;
}

export default function CollectiveGoalsComponent({
  goals,
  isLoading,
}: CollectiveGoalsProps) {
  const [mountOlympusWidth, setMountOlympusWidth] = useState("0%");
  const [kenyaRunWidth, setKenyaRunWidth] = useState("0%");

  useEffect(() => {
    if (!isLoading) {
      // Animate progress bars
      setTimeout(() => {
        setMountOlympusWidth(
          `${Math.min(goals.mountOlympus.progressPercentage, 100)}%`
        );
        setKenyaRunWidth(
          `${Math.min(goals.kenyaRun.progressPercentage, 100)}%`
        );
      }, 300);
    }
  }, [goals, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">Collective Goals</h2>

      <div className="text-center mb-6">
        <p className="text-sm mb-4">Join forces to achieve epic milestones!</p>
        <div className="inline-block border-2 border-white p-3 rounded-lg bg-black bg-opacity-50">
          <span className="text-yellow-400">
            🏆 Every rep makes a difference!
          </span>
        </div>
      </div>

      {/* Mount Olympus Challenge */}
      <div className="mb-10 relative">
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 mb-2 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-pink-500 flex items-center justify-center pulse-animation">
              <span className="text-2xl">💪</span>
            </div>
          </div>
          <h3 className="text-lg mb-1">Bench Press Mount Olympus</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xl text-pink-500">
              {formatNumber(goals.mountOlympus.current)}
            </span>
            <span className="text-sm">
              / {formatNumber(goals.mountOlympus.goal)} push-ups
            </span>
          </div>
        </div>

        <div className="progress-container h-8 mb-2 relative overflow-hidden">
          <div
            className="progress-bar progress-bar-pushups"
            style={{
              width: mountOlympusWidth,
              transition: "width 1.5s ease-in-out",
            }}
          >
            {goals.mountOlympus.progressPercentage > 10 && (
              <div className="absolute top-0 right-2 h-full flex items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">💪</span>
                  <span className="text-xs font-bold">
                    {goals.mountOlympus.progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          {goals.mountOlympus.progressPercentage <= 10 && (
            <div className="progress-text font-bold">
              {goals.mountOlympus.progressPercentage.toFixed(1)}%
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs mt-2 max-w-md mx-auto">
            Each push-up = 1kg of force lifted. Together we&apos;re lifting
            Mount Olympus (2917m × 100kg)!
          </p>
        </div>
      </div>

      {/* Kenya Run Challenge */}
      <div className="relative">
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 mb-2 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center pulse-animation">
              <span className="text-2xl">🏃</span>
            </div>
          </div>
          <h3 className="text-lg mb-1">Run the length of Kenya</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xl text-green-500">
              {formatNumber(goals.kenyaRun.current)}
            </span>
            <span className="text-sm">
              / {formatNumber(goals.kenyaRun.goal)} squats
            </span>
          </div>
        </div>

        <div className="progress-container h-8 mb-2 relative overflow-hidden">
          <div
            className="progress-bar progress-bar-squats"
            style={{
              width: kenyaRunWidth,
              transition: "width 1.5s ease-in-out",
            }}
          >
            {goals.kenyaRun.progressPercentage > 10 && (
              <div className="absolute top-0 right-2 h-full flex items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">🏃</span>
                  <span className="text-xs font-bold">
                    {goals.kenyaRun.progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          {goals.kenyaRun.progressPercentage <= 10 && (
            <div className="progress-text font-bold">
              {goals.kenyaRun.progressPercentage.toFixed(1)}%
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs mt-2 max-w-md mx-auto">
            1 squat = 1 meter. We&apos;re running from Mandera to Lunga Lunga
            (1,030 kilometers)!
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a
          href="https://imperfectform.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="retro-button pulse-button"
        >
          Visit imperfectform.fun 💪
        </a>
        <p className="text-xs mt-4">
          Log your workouts at imperfectform.fun to contribute.
        </p>
      </div>
    </div>
  );
}
