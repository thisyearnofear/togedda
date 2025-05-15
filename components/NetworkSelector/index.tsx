"use client";

import { NETWORK_COLORS } from "@/lib/constants";
import { getNetworkName } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: string[];
  selectedNetwork: string;
  onSelectNetwork: (network: string) => void;
}

export default function NetworkSelector({
  networks,
  selectedNetwork,
  onSelectNetwork,
}: NetworkSelectorProps) {
  return (
    <div className="game-container p-4 my-4">
      <h3 className="text-center text-lg mb-4">Select Network</h3>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => onSelectNetwork("all")}
          className={`network-button ${
            selectedNetwork === "all" ? "active-network" : ""
          }`}
        >
          <div className="network-icon-container">
            <div className="network-icon network-all">
              <span>🌐</span>
            </div>
          </div>
          <span className="network-name">All</span>
        </button>

        {networks.map((network) => {
          const isSelected = network === selectedNetwork;
          const networkColor =
            NETWORK_COLORS[network as keyof typeof NETWORK_COLORS];
          let networkEmoji = "🔗";

          // Network-specific emojis
          if (network === "polygon") networkEmoji = "🟣";
          if (network === "celo") networkEmoji = "🟡";
          if (network === "base") networkEmoji = "🔵";
          if (network === "monad") networkEmoji = "⚫";

          return (
            <button
              key={network}
              onClick={() => onSelectNetwork(network)}
              className={`network-button ${isSelected ? "active-network" : ""}`}
            >
              <div className="network-icon-container">
                <div
                  className="network-icon"
                  style={{ backgroundColor: networkColor }}
                >
                  <span>{networkEmoji}</span>
                </div>
              </div>
              <span className="network-name">{getNetworkName(network)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
