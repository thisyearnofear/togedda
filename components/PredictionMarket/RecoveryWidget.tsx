"use client";

import React, { useState } from "react";
import { Prediction, PredictionStatus } from "@/lib/prediction-market-v2";

interface RecoveryWidgetProps {
  prediction: Prediction;
}

export default function RecoveryWidget({ prediction }: RecoveryWidgetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ challengeId?: number; txHash?: string } | null>(null);
  const now = Math.floor(Date.now() / 1000);
  const missed = prediction.status === 0 && now > prediction.targetDate && prediction.currentValue < prediction.targetValue;
  if (!missed) return null;

  const remaining = Math.max(0, prediction.targetValue - prediction.currentValue);
  const recoverable = 0.8; // 80%

  return (
    <div className="bg-purple-900 bg-opacity-20 border border-purple-700 rounded p-3">
      <div className="text-xs text-purple-300 font-bold mb-1">Recovery Opportunity</div>
      <div className="text-xs text-gray-300 mb-2">
        Complete <span className="font-bold text-purple-200">{remaining}</span> more reps in 24 hours to recover <span className="font-bold text-green-300">80%</span> of your stake.
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            try {
              setSubmitting(true);
              const resp = await fetch('/api/sweat-equity/create-challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userAddress: prediction.creator,
                  predictionId: prediction.id,
                  exerciseType: 0,
                  targetAmount: remaining,
                }),
              });
              const json = await resp.json();
              if (json.success) {
                setSubmitted({ challengeId: json.challengeId, txHash: json.txHash });
              }
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Accept Challenge'}
        </button>
        <button className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded">Details</button>
      </div>
      {submitted && (
        <div className="text-[10px] text-gray-400 mt-2">
          Challenge #{submitted.challengeId} • Tx {submitted.txHash?.slice(0, 10)}...
        </div>
      )}
    </div>
  );
}