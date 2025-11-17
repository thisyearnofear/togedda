"use client";

import React, { useEffect, useState } from "react";
import { aggregateVerification } from "@/lib/enhanced-oracle-system";
import { type SupportedChain } from "@/lib/services/dual-chain-service";

interface ProofPanelProps {
  predictionId: number;
  chain: SupportedChain;
  onClose?: () => void;
}

export default function ProofPanel({ predictionId, chain, onClose }: ProofPanelProps) {
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const result = await aggregateVerification("user", "pushups", 100);
        const parsed = result.proof ? JSON.parse(result.proof) : [];
        setProof(parsed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [predictionId, chain]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-white rounded-lg p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white">Proof Details</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        {loading && (
          <div className="text-xs text-gray-400">Loading proof...</div>
        )}

        {error && (
          <div className="text-xs text-red-400">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-2">
            {proof.length === 0 && (
              <div className="text-xs text-gray-400">No proof entries</div>
            )}
            {proof.map((entry: any, idx: number) => (
              <div key={idx} className="bg-gray-900 border border-gray-700 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white">{String(entry.sourceChain).toUpperCase()}</div>
                  <div className="text-xs text-gray-400">{entry.amount}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate">
                  <a
                    href={`${entry.sourceChain === 'base' ? 'https://basescan.org/tx/' : entry.sourceChain === 'celo' ? 'https://celoscan.io/tx/' : 'https://bscscan.com/tx/'}${entry.verificationHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {entry.verificationHash}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}