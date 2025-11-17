"use client";

import React, { useEffect, useState } from "react";
import { type SupportedChain } from "@/lib/services/dual-chain-service";

interface VerificationStatusProps {
  predictionId: number;
  chain: SupportedChain;
  exerciseType?: string;
  requiredAmount?: number;
}

export default function VerificationStatus({
  predictionId,
  chain,
  exerciseType = "pushups",
  requiredAmount = 250,
}: VerificationStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>("");
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          predictionId: String(predictionId),
          exerciseType,
          requiredAmount: String(requiredAmount),
        });
        const resp = await fetch(`/api/attestations/status?${params.toString()}`);
        const json = await resp.json();
        if (!json.success) throw new Error(json.error || "Failed to fetch status");
        const data = json.data;
        setProgress(Math.min(100, Math.max(0, data.confidence)));
        setMessage(data.message);
        setRemaining(data.challengeWindow?.endsAt ? data.challengeWindow.endsAt - Math.floor(Date.now() / 1000) : 0);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [predictionId, chain, exerciseType, requiredAmount]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded p-2">
        <div className="text-xs text-gray-400">Verifying...</div>
        <div className="w-full bg-gray-800 h-2 rounded mt-2">
          <div className="bg-blue-600 h-2 rounded animate-pulse" style={{ width: "50%" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded p-2">
        <div className="text-xs text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-300">Verification Progress</div>
        <div className="text-xs text-gray-400">{progress}%</div>
      </div>
      <div className="w-full bg-gray-800 h-2 rounded mt-2">
        <div className="bg-green-600 h-2 rounded" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-2 truncate">{message}</div>
      {remaining > 0 && (
        <div className="text-xs text-yellow-300 mt-1">Challenge window: {Math.max(0, remaining)}s remaining</div>
      )}
    </div>
  );
}