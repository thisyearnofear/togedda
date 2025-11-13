"use client";

import { NetworkData, getNetworkContributions } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SportsData {
  pushups?: number;
  squats?: number;
  pullups?: number;
  jumps?: number;
  situps?: number;
  users?: string[];
}

interface CrossPlatformData {
  imperfectform: SportsData;
  imperfectcoach: SportsData;
  imperfectabs: SportsData;
  totals: {
    pushups: number;
    squats: number;
    pullups: number;
    jumps: number;
    situps: number;
    totalExercises: number;
  };
}

interface NetworkContributionsProps {
  data: NetworkData;
  isLoading: boolean;
}

export default function NetworkContributions({
  data,
  isLoading,
}: NetworkContributionsProps) {
  const [contributions, setContributions] = useState<{
    pushups: Record<string, { count: number; percentage: number }>;
    squats: Record<string, { count: number; percentage: number }>;
  } | null>(null);
  const [sportsData, setSportsData] = useState<CrossPlatformData | null>(null);
  const [sportsLoading, setSportsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && data) {
      const networkContributions = getNetworkContributions(data);
      setContributions(networkContributions);
    }
  }, [data, isLoading]);

  // Fetch Sports Central data (cross-platform sports platforms)
  useEffect(() => {
    const fetchSportsData = async () => {
      try {
        setSportsLoading(true);
        const response = await fetch('/api/sports-central');
        const result = await response.json();
        if (result.success) {
          setSportsData(result.data);
        }
      } catch (err) {
        console.error('Error fetching sports data:', err);
      } finally {
        setSportsLoading(false);
      }
    };

    fetchSportsData();
  }, []);

  if (isLoading || !contributions) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">
        Onchain Olympians (in training)
      </h2>

      <div className="text-center mb-6">
        <div className="inline-block border-2 border-white p-2 rounded-lg bg-black bg-opacity-50">
          <span className="text-yellow-400 text-sm">
            🏆 Cross-chain competition
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Push-ups Contributions */}
        <div className="flex-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center">
              <span className="text-xl">💪</span>
            </div>
            <h3 className="text-lg ml-3">Push-ups</h3>
          </div>

          <div className="space-y-6">
            {Object.entries(contributions.pushups)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([network, { count, percentage }], index) => {
                const networkColor =
                  NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] ||
                  "white";
                const isLeader = index === 0;

                return (
                  <div
                    key={`pushups-${network}`}
                    className="relative network-card"
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className="w-8 h-8 rounded-full mr-2 flex items-center justify-center"
                        style={{ backgroundColor: networkColor }}
                      >
                        {isLeader && <span className="text-sm">👑</span>}
                      </div>
                      <span className="text-sm font-bold">
                        {getNetworkName(network)}
                      </span>
                      <div className="ml-auto flex items-center">
                        <span className="text-lg font-bold">
                          {formatNumber(count)}
                        </span>
                        <span className="text-xs ml-1">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div
                      className="progress-container"
                      style={{ height: "24px" }}
                    >
                      <div
                        className="progress-bar"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: networkColor,
                          boxShadow: isLeader
                            ? `0 0 10px ${networkColor}`
                            : "none",
                          transition:
                            "width 1s ease-in-out, box-shadow 0.5s ease",
                        }}
                      >
                        {isLeader && (
                          <div className="h-full flex items-center justify-end pr-2">
                            <span className="text-xs animate-pulse">
                              LEADING
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Squats Contributions */}
        <div className="flex-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-xl">🏃</span>
            </div>
            <h3 className="text-lg ml-3">Squats</h3>
          </div>

          <div className="space-y-6">
            {Object.entries(contributions.squats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([network, { count, percentage }], index) => {
                const networkColor =
                  NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] ||
                  "white";
                const isLeader = index === 0;

                return (
                  <div
                    key={`squats-${network}`}
                    className="relative network-card"
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className="w-8 h-8 rounded-full mr-2 flex items-center justify-center"
                        style={{ backgroundColor: networkColor }}
                      >
                        {isLeader && <span className="text-sm">👑</span>}
                      </div>
                      <span className="text-sm font-bold">
                        {getNetworkName(network)}
                      </span>
                      <div className="ml-auto flex items-center">
                        <span className="text-lg font-bold">
                          {formatNumber(count)}
                        </span>
                        <span className="text-xs ml-1">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div
                      className="progress-container"
                      style={{ height: "24px" }}
                    >
                      <div
                        className="progress-bar"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: networkColor,
                          boxShadow: isLeader
                            ? `0 0 10px ${networkColor}`
                            : "none",
                          transition:
                            "width 1s ease-in-out, box-shadow 0.5s ease",
                        }}
                      >
                        {isLeader && (
                          <div className="h-full flex items-center justify-end pr-2">
                            <span className="text-xs animate-pulse">
                              LEADING
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="flex justify-center space-x-4">
          {Object.entries(NETWORK_COLORS).map(([network, color]) => (
            <div key={network} className="text-center">
              <div
                className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center"
                style={{ backgroundColor: color }}
              >
                <span className="text-xs">
                  {network.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-xs">{getNetworkName(network)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sports Platform Statistics */}
      {!sportsLoading && sportsData && (
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h2 className="retro-heading text-xl mb-6">
            🏆 Sports Platforms Integration
          </h2>

          <div className="text-center mb-6">
            <div className="inline-block border-2 border-yellow-600 p-2 rounded-lg bg-black bg-opacity-50">
              <span className="text-yellow-400 text-sm">
                Multi-App Connected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* ImperfectForm Card */}
            <div className="bg-gray-900 p-4 rounded-lg border border-purple-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-purple-400">💪 ImperfectForm</h3>
                <span className="text-purple-400">🟣</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pushups:</span>
                  <span className="font-mono">{sportsData.imperfectform.pushups || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Squats:</span>
                  <span className="font-mono">{sportsData.imperfectform.squats || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Users:</span>
                  <span className="font-mono">{sportsData.imperfectform.users?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* ImperfectCoach Card */}
            <div className="bg-gray-900 p-4 rounded-lg border border-green-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-green-400">🏋️ ImperfectCoach</h3>
                <span className="text-green-400">🟢</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pullups:</span>
                  <span className="font-mono">{sportsData.imperfectcoach.pullups || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jumps:</span>
                  <span className="font-mono">{sportsData.imperfectcoach.jumps || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Users:</span>
                  <span className="font-mono">{sportsData.imperfectcoach.users?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* ImperfectAbs Card */}
            <div className="bg-gray-900 p-4 rounded-lg border border-yellow-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-yellow-400">🏃 ImperfectAbs</h3>
                <span className="text-yellow-400">🟡</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Situps:</span>
                  <span className="font-mono">{sportsData.imperfectabs.situps || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Users:</span>
                  <span className="font-mono">{sportsData.imperfectabs.users?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-r from-purple-900/50 to-green-900/50 to-yellow-900/50 p-4 rounded-lg border-2 border-white text-center">
            <h3 className="text-lg font-bold mb-2">Total Exercises Across All Platforms</h3>
            <div className="text-3xl font-bold text-white">{sportsData.totals.totalExercises.toLocaleString()}</div>
            <div className="text-sm text-gray-300 mt-1">combined from ImperfectForm, ImperfectCoach, and ImperfectAbs</div>
          </div>
        </div>
      )}
    </div>
  );
}
