/**
 * ResolutionMonitor Component
 *
 * Compact UI for displaying prediction resolution status
 * Optimized for Farcaster mini app space requirements
 */

"use client";

import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from 'framer-motion';

interface ResolutionStatus {
  pending: number;
  resolved: number;
  monitoring: Array<{
    predictionId: number;
    title: string;
    targetDate: number;
    resolutionType: string;
  }>;
  recent: Array<{
    predictionId: number;
    outcome: "YES" | "NO" | "UNRESOLVED";
    confidence: number;
    source: string;
    transactionHash?: string;
  }>;
}

interface ResolutionMonitorProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ResolutionMonitor({
  compact = true,
  showDetails = false,
  className = "",
}: ResolutionMonitorProps) {
  const [status, setStatus] = useState<ResolutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch resolution status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/predictions/resolve");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setStatus(data.data.status);
        setError(null);
      } else {
        throw new Error(data.error || "Failed to fetch status");
      }
    } catch (err) {
      console.error("Failed to fetch resolution status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Manual resolution trigger
  const triggerResolution = async (predictionId: number) => {
    try {
      const response = await fetch("/api/predictions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger",
          predictionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh status after resolution
        await fetchStatus();
      } else {
        console.error("Resolution failed:", data.error);
      }
    } catch (err) {
      console.error("Failed to trigger resolution:", err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 bg-red-400 rounded-full" />
        <span className="text-xs text-red-400">Offline</span>
      </div>
    );
  }

  if (!status) return null;

  // Compact view for mini app
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform ${className}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              status.pending > 0
                ? "bg-yellow-400 animate-pulse"
                : "bg-green-400"
            }`}
          />
          <span className="text-xs font-mono text-gray-300">
            {status.pending}⏳ {status.resolved}✅
          </span>
        </div>

        {expanded && (
          <div className="flex items-center gap-1 overflow-hidden transition-all duration-300">
            {status.recent.slice(0, 3).map((resolution, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded text-xs flex items-center justify-center ${
                  resolution.outcome === "YES"
                    ? "bg-green-500 text-white"
                    : resolution.outcome === "NO"
                    ? "bg-red-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
                title={`Prediction ${resolution.predictionId}: ${resolution.outcome}`}
              >
                {resolution.outcome === "YES"
                  ? "✓"
                  : resolution.outcome === "NO"
                  ? "✗"
                  : "?"}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status Overview */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Resolution Monitor</h3>
        <button
          onClick={fetchStatus}
          className="text-xs text-blue-400 hover:text-blue-300"
          disabled={loading}
        >
          {loading ? "⟳" : "↻"} Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 rounded p-2">
          <div className="text-xs text-gray-400">Monitoring</div>
          <div className="text-lg font-mono text-yellow-400">
            {status.pending}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <div className="text-xs text-gray-400">Resolved</div>
          <div className="text-lg font-mono text-green-400">
            {status.resolved}
          </div>
        </div>
      </div>

      {/* Pending Predictions */}
      {status.monitoring.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-300">
            Pending Resolution
          </h4>
          {status.monitoring.slice(0, 3).map((prediction) => {
            const isOverdue = Date.now() / 1000 > prediction.targetDate;
            return (
              <div
                key={prediction.predictionId}
                className="flex items-center justify-between bg-gray-800 rounded p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">
                    #{prediction.predictionId}: {prediction.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {prediction.resolutionType} •{" "}
                    {isOverdue
                      ? "Overdue"
                      : new Date(
                          prediction.targetDate * 1000
                        ).toLocaleDateString()}
                  </div>
                </div>
                {isOverdue && (
                  <button
                    onClick={() => triggerResolution(prediction.predictionId)}
                    className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                  >
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Resolutions */}
      {status.recent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-300">
            Recent Resolutions
          </h4>
          {status.recent.slice(0, 3).map((resolution, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-800 rounded p-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    resolution.outcome === "YES"
                      ? "bg-green-500"
                      : resolution.outcome === "NO"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
                />
                <span className="text-xs text-white">
                  #{resolution.predictionId}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {resolution.outcome} ({Math.round(resolution.confidence * 100)}
                %)
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility hook for resolution status
export function useResolutionStatus() {
  const [status, setStatus] = useState<ResolutionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/predictions/resolve");
        const data = await response.json();

        if (data.success) {
          setStatus(data.data.status);
        }
      } catch (err) {
        console.error("Failed to fetch resolution status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  return { status, loading };
}
