"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import {
  NetworkData,
  calculateCollectiveGoals,
  fetchAllNetworksData,
} from "@/lib/blockchain";
import { CollectiveGoals } from "@/lib/blockchain";
import Image from "next/image";
import { useEffect, useState } from "react";
import CollectiveGoalsComponent from "../CollectiveGoals";
import Leaderboard from "../Leaderboard";
import NetworkContributions from "../NetworkContributions";
import NetworkSelector from "../NetworkSelector";
import PersonalDashboard from "../PersonalDashboard";
import PredictionMarket from "../PredictionMarket";

export default function Home() {
  const {
    signIn,
    isLoading: authLoading,
    isSignedIn,
    user,
  } = useSignIn({
    autoSignIn: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [networkData, setNetworkData] = useState<NetworkData>({});
  const [goals, setGoals] = useState<CollectiveGoals>({
    totalPushups: 0,
    totalSquats: 0,
    mountOlympus: { goal: 0, current: 0, progressPercentage: 0 },
    kenyaRun: { goal: 0, current: 0, progressPercentage: 0 },
  });
  const [selectedNetwork, setSelectedNetwork] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTab, setSelectedTab] = useState<
    "goals" | "leaderboard" | "networks" | "predictions" | "personal"
  >("goals");

  // Call Farcaster SDK ready
  useEffect(() => {
    const initFarcaster = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        // Call ready to hide the splash screen
        await sdk.actions.ready({ disableNativeGestures: false });
        console.log("Farcaster SDK ready called from Home component");
      } catch (error) {
        console.error("Error calling Farcaster SDK ready from Home:", error);
      }
    };

    initFarcaster();
  }, []);

  // Fetch data from blockchain
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchAllNetworksData();
        setNetworkData(data);

        const calculatedGoals = calculateCollectiveGoals(data);
        setGoals(calculatedGoals);
      } catch (error) {
        console.error("Error fetching blockchain data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [refreshTrigger]);

  // Handle network selection
  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="retro-arcade min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Arcade-Style Logo */}
        <header className="text-center mb-6">
          <div className="game-container py-4 px-6 mb-4 bg-black">
            <h1
              className="text-2xl mb-2 pulse-animation"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              IMPERFECT FORM
            </h1>
            <div className="flex justify-center space-x-2 mt-2">
              <span className="h-4 w-4 rounded-full bg-celo"></span>
              <span className="h-4 w-4 rounded-full bg-polygon"></span>
              <span className="h-4 w-4 rounded-full bg-base-chain"></span>
              <span className="h-4 w-4 rounded-full bg-monad"></span>
            </div>
          </div>

          {/* User Profile */}
          <div className="mb-6">
            {isSignedIn && user && (
              <div className="game-container py-3 px-4 inline-flex items-center space-x-3">
                <Image
                  src={user.pfp_url}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-white"
                  width={48}
                  height={48}
                />
                <div className="text-left">
                  <p className="text-sm">{user.display_name}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="ml-2 p-2 border-2 border-white rounded-full hover:bg-white hover:text-black transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "⟳" : "⟳"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center mb-4">
            <button
              className={`retro-button mx-2 my-1 ${
                selectedTab === "goals"
                  ? "scale-105 border-white text-white"
                  : ""
              }`}
              onClick={() => setSelectedTab("goals")}
            >
              Collective Goals
            </button>
            <button
              className={`retro-button mx-2 my-1 ${
                selectedTab === "leaderboard"
                  ? "scale-105 border-white text-white"
                  : ""
              }`}
              onClick={() => setSelectedTab("leaderboard")}
            >
              Leaderboard
            </button>
            <button
              className={`retro-button mx-2 my-1 ${
                selectedTab === "networks"
                  ? "scale-105 border-white text-white"
                  : ""
              }`}
              onClick={() => setSelectedTab("networks")}
            >
              Networks
            </button>
            <button
              className={`retro-button mx-2 my-1 ${
                selectedTab === "predictions"
                  ? "scale-105 border-white text-white"
                  : ""
              }`}
              onClick={() => setSelectedTab("predictions")}
            >
              Predictions
            </button>
            <button
              className={`retro-button mx-2 my-1 ${
                selectedTab === "personal"
                  ? "scale-105 border-white text-white"
                  : ""
              }`}
              onClick={() => setSelectedTab("personal")}
            >
              My Stats
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {selectedTab === "goals" && (
              <CollectiveGoalsComponent goals={goals} isLoading={isLoading} />
            )}

            {selectedTab === "leaderboard" && (
              <>
                <NetworkSelector
                  networks={Object.keys(networkData)}
                  selectedNetwork={selectedNetwork}
                  onSelectNetwork={handleNetworkSelect}
                />
                <Leaderboard
                  data={networkData}
                  selectedNetwork={selectedNetwork}
                  isLoading={isLoading}
                />
              </>
            )}

            {selectedTab === "networks" && (
              <NetworkContributions data={networkData} isLoading={isLoading} />
            )}

            {selectedTab === "predictions" && <PredictionMarket />}

            {selectedTab === "personal" && (
              <PersonalDashboard
                networkData={networkData}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mb-8">
          <a
            href="https://imperfectform.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="retro-button text-lg px-8 py-4 inline-block"
          >
            Carry The Boats 🚣🌊
          </a>
        </div>
      </div>
    </div>
  );
}
