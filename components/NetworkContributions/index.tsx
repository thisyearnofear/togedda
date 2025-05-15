"use client";

import { NetworkData, getNetworkContributions } from "@/lib/blockchain";
import { NETWORK_COLORS } from "@/lib/constants";
import { formatNumber, getNetworkName } from "@/lib/utils";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!isLoading && data) {
      const networkContributions = getNetworkContributions(data);
      setContributions(networkContributions);
    }
  }, [data, isLoading]);

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
        <p className="text-sm mb-4">
          Build that BASE u M(on)AD one. Saggy buns? PolyGONE.{" "}
        </p>
        <div className="inline-block border-2 border-white p-3 rounded-lg bg-black bg-opacity-50">
          <span className="text-yellow-400 font-bold">
            CELObrate vim & vigour: use it or lose it
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
        <div className="inline-block border-2 border-white p-4 rounded-lg bg-black bg-opacity-50">
          <h3 className="text-lg mb-2">How to COOK</h3>
          <p className="text-sm mb-4">
            Do reps on any chain, raise dosh for charity. Feel good, Look good,
            do Good.
          </p>
          <div className="flex justify-center space-x-4">
            {Object.entries(NETWORK_COLORS).map(([network, color]) => (
              <div key={network} className="text-center">
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center"
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
      </div>
    </div>
  );
}
