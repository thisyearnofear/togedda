"use client";

import React from "react";
import { useConnect } from "wagmi";

export default function WalletConnectPresets() {
  const { connectors, connect } = useConnect();
  const wc = connectors.find((c) => c.id === "walletConnect");

  if (!wc) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">Preferred wallets</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => connect({ connector: wc })}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-yellow-500 text-black text-xs font-bold"
        >
          🟡 Binance Wallet
        </button>
        <button
          onClick={() => connect({ connector: wc })}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold"
        >
          🔷 Trust Wallet
        </button>
      </div>
      <div className="text-[10px] text-gray-500">Uses WalletConnect — select your wallet in the prompt</div>
    </div>
  );
}