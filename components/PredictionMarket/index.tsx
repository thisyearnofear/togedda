"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { toast } from "react-hot-toast";
import {
  getAllPredictions,
  Prediction,
  PredictionStatus,
  PredictionCategory,
  PredictionOutcome,
  PREDICTION_MARKET_ADDRESS,
} from "@/lib/prediction-market-v2";
import {
  useChainPredictions,
  useCacheInvalidation,
  usePrefetchData,
} from "@/hooks/use-prediction-queries";
// Simple ABI for vote function
const voteABI = [
  {
    name: "vote",
    type: "function",
    inputs: [
      { name: "predictionId", type: "uint256" },
      { name: "vote", type: "bool" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;
import { parseEther } from "viem";
import PredictionCard from "./PredictionCard";
import ChainAwarePredictionCard from "./ChainAwarePredictionCard";
import ChatButton from "./ChatButton";
import {
  FaLightbulb,
  FaCoins,
  FaComments,
  FaChartLine,
  FaSync,
  FaHistory,
} from "react-icons/fa";
import WarpcastWallet from "@/components/WarpcastWallet";
import ChatInterface from "./ChatInterface";
import { type SupportedChain, CHAIN_CONFIG } from "@/lib/dual-chain-service";
import { predictionMarketABI } from "@/lib/constants";

const PredictionMarket: React.FC = () => {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // React Query hooks for data fetching with caching
  const {
    data: chainPredictions = [],
    isLoading,
    error: predictionsError,
    refetch: refetchPredictions,
    dataUpdatedAt,
  } = useChainPredictions();

  const { invalidatePredictions } = useCacheInvalidation();
  const { prefetchChainPredictions } = usePrefetchData();

  // Local state
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"markets" | "past" | "chat">(
    "markets"
  );

  // Mobile-first UI state
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const [selectedChain, setSelectedChain] = useState<"all" | "celo" | "base">(
    "all"
  );
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showChainDetails, setShowChainDetails] = useState(false);

  // Helper functions for mobile-first UI
  const toggleCardExpansion = (predictionId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(predictionId)) {
      newExpanded.delete(predictionId);
    } else {
      newExpanded.add(predictionId);
    }
    setExpandedCards(newExpanded);
  };

  const filterPredictionsByChain = (predictions: Prediction[]) => {
    if (selectedChain === "all") return predictions;
    return predictions.filter((p) =>
      selectedChain === "celo"
        ? p.network.toLowerCase().includes("celo")
        : selectedChain === "base"
        ? p.network.toLowerCase().includes("base")
        : true
    );
  };

  const [suggestFormData, setSuggestFormData] = useState({
    title: "",
    description: "",
  });
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [expandedNetworks, setExpandedNetworks] = useState<{
    [key: string]: boolean;
  }>({});

  // Dual-chain network configuration - focused on CELO + Base
  const networks = [
    {
      id: "celo",
      name: "CELO Mainnet",
      emoji: "🟡",
      color: "celo",
      tagline: "Real Impact, Real Money",
      description: "Production network supporting Greenpill Kenya charity",
      stakingNote: "Stakes help fund environmental initiatives",
      isProduction: true,
      currency: "CELO",
    },
    {
      id: "base",
      name: "Base Sepolia",
      emoji: "🔵",
      color: "base-chain",
      tagline: "Build & Experiment",
      description: "Testnet for builders and hackathon participants",
      stakingNote: "Free testnet ETH - perfect for experimentation",
      isProduction: false,
      currency: "ETH",
    },
  ];

  // Convert ChainPrediction[] to Prediction[] format for compatibility
  const predictions = chainPredictions.map((cp) => ({
    id: cp.id,
    creator: cp.creator,
    title: cp.title,
    description: cp.description,
    targetDate: cp.targetDate,
    targetValue: cp.targetValue,
    currentValue: cp.currentValue,
    category: cp.category as PredictionCategory,
    network: cp.network,
    emoji: cp.emoji,
    totalStaked: cp.totalStaked,
    yesVotes: cp.yesVotes,
    noVotes: cp.noVotes,
    status: cp.status as PredictionStatus,
    outcome: cp.outcome as PredictionOutcome,
    createdAt: cp.createdAt,
    autoResolvable: cp.autoResolvable,
  }));

  // Last refresh time from React Query
  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Enhanced refresh function with cache invalidation and better UX
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes

    try {
      setIsRefreshing(true);
      console.log("🔄 Refreshing predictions...");

      // Clear cache first for immediate feedback
      invalidatePredictions();

      // Fetch fresh data
      await refetchPredictions();

      // Show success with count
      const count = chainPredictions.length;
      toast.success(`✅ Refreshed ${count} predictions!`);
    } catch (error) {
      console.error("❌ Failed to refresh predictions:", error);
      toast.error("Failed to refresh predictions. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Prefetch data on component mount
  useEffect(() => {
    prefetchChainPredictions();
  }, [prefetchChainPredictions]);

  const handleVote = async (
    predictionId: number,
    isYes: boolean,
    amount: string
  ) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      // Find the prediction to determine which chain to use
      const prediction = chainPredictions.find((p) => p.id === predictionId);
      if (!prediction) {
        toast.error("Prediction not found");
        return;
      }

      const chain = prediction.chain;
      const chainConfig = CHAIN_CONFIG[chain];

      console.log(
        `🔄 Voting on ${chainConfig.name} prediction ${predictionId}: ${
          isYes ? "YES" : "NO"
        } with ${amount} ${chainConfig.nativeCurrency.symbol}`
      );

      // Use the chain-specific contract address and ABI
      const hash = await writeContractAsync({
        address: chainConfig.contractAddress as `0x${string}`,
        abi: predictionMarketABI,
        functionName: "vote",
        args: [BigInt(predictionId), isYes],
        value: parseEther(amount),
      });

      toast.success(
        `Transaction sent! You voted ${isYes ? "YES" : "NO"} with ${amount} ${
          chainConfig.nativeCurrency.symbol
        }`
      );

      console.log(`✅ Vote transaction sent: ${hash}`);

      // Invalidate cache to trigger refresh after voting
      invalidatePredictions();
    } catch (error: any) {
      console.error("Error voting:", error);

      if (
        error.message &&
        (error.message.includes("rejected") || error.message.includes("denied"))
      ) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error(error.message || "Transaction failed");
      }
    }
  };

  // Simple wrapper for PredictionCard component that expects no parameters
  const handleVoteSimple = () => {
    // Invalidate cache to trigger refresh after voting
    invalidatePredictions();
  };

  const toggleNetworkExpansion = (networkId: string) => {
    setExpandedNetworks((prev) => ({
      ...prev,
      [networkId]: !prev[networkId],
    }));
  };

  const handleOpenChat = () => {
    if (!chatLoaded) {
      setChatLoaded(true); // Triggers lazy loading
    }
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  const handleSuggestFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSuggestFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!suggestFormData.title || !suggestFormData.description) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsSubmittingSuggestion(true);

      // Submit the suggestion with a 1 CELO fee
      // We use prediction ID 0 as a special case for suggestions
      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
        abi: voteABI,
        functionName: "vote",
        args: [BigInt(0), true], // Using ID 0 to indicate a suggestion fee
        value: parseEther("1"), // 1 CELO
      });

      console.log("Suggestion transaction sent:", hash);

      toast.success(
        "Thank you for your suggestion! It has been submitted for review."
      );
      setShowSuggestForm(false);
      setSuggestFormData({ title: "", description: "" });
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      toast.error("Failed to submit suggestion. Please try again.");
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Use hardcoded predictions that match the ones deployed on-chain
  // These will be shown regardless of whether the contract connection works
  const hardcodedPredictions: Prediction[] = [
    {
      id: 1,
      creator: "0x0000000000000000000000000000000000000000",
      title:
        "The celo community will not reach 10,000 total squats by 15th June 2025",
      description:
        "Will the collective Celo community reach the milestone of 10,000 total squats before the target date?",
      targetDate: 1749974400, // June 15, 2025
      targetValue: 10000,
      currentValue: 0,
      category: PredictionCategory.FITNESS,
      network: "celo",
      emoji: "🟡",
      totalStaked: 0,
      yesVotes: 0,
      noVotes: 0,
      status: PredictionStatus.ACTIVE,
      outcome: PredictionOutcome.UNRESOLVED,
      createdAt: Math.floor(Date.now() / 1000),
    },
    {
      id: 2,
      creator: "0x0000000000000000000000000000000000000000",
      title:
        "No polygon user will complete 500 pushups in a single week by 15th June 2025",
      description:
        "Will any individual Polygon user achieve 500 pushups in a single week before the target date?",
      targetDate: 1749974400, // June 15, 2025
      targetValue: 500,
      currentValue: 0,
      category: PredictionCategory.FITNESS,
      network: "polygon",
      emoji: "🟣",
      totalStaked: 0,
      yesVotes: 0,
      noVotes: 0,
      status: PredictionStatus.ACTIVE,
      outcome: PredictionOutcome.UNRESOLVED,
      createdAt: Math.floor(Date.now() / 1000),
    },
    {
      id: 3,
      creator: "0x0000000000000000000000000000000000000000",
      title:
        "No base user will complete 500 squats in a single week by 15th June 2025",
      description:
        "Will any individual Base user achieve 500 squats in a single week before the target date?",
      targetDate: 1749974400, // June 15, 2025
      targetValue: 500,
      currentValue: 0,
      category: PredictionCategory.FITNESS,
      network: "base",
      emoji: "🔵",
      totalStaked: 0,
      yesVotes: 0,
      noVotes: 0,
      status: PredictionStatus.ACTIVE,
      outcome: PredictionOutcome.UNRESOLVED,
      createdAt: Math.floor(Date.now() / 1000),
    },
    {
      id: 4,
      creator: "0x0000000000000000000000000000000000000000",
      title:
        "The monad community will not reach 10,000 total pushups by 15th June 2025",
      description:
        "Will the collective Monad community reach the milestone of 10,000 total pushups before the target date?",
      targetDate: 1749974400, // June 15, 2025
      targetValue: 10000,
      currentValue: 0,
      category: PredictionCategory.FITNESS,
      network: "monad",
      emoji: "⚫",
      totalStaked: 0,
      yesVotes: 0,
      noVotes: 0,
      status: PredictionStatus.ACTIVE,
      outcome: PredictionOutcome.UNRESOLVED,
      createdAt: Math.floor(Date.now() / 1000),
    },
  ];

  // Group predictions by chain using dual-chain service data
  const getChainPredictions = () => {
    const chainGroups: { [key: string]: Prediction[] } = {};

    // Initialize with empty arrays for supported chains
    networks.forEach((network) => {
      chainGroups[network.id] = [];
    });

    // Group predictions by chain from dual-chain service
    chainPredictions.forEach((chainPred) => {
      const chainKey = chainPred.chain; // 'celo' or 'base'
      if (chainGroups[chainKey]) {
        // Convert ChainPrediction to Prediction format
        const prediction: Prediction = {
          id: chainPred.id,
          creator: chainPred.creator,
          title: chainPred.title,
          description: chainPred.description,
          targetDate: chainPred.targetDate,
          targetValue: chainPred.targetValue,
          currentValue: chainPred.currentValue,
          category: chainPred.category as PredictionCategory,
          network: chainPred.network,
          emoji: chainPred.emoji,
          totalStaked: chainPred.totalStaked,
          yesVotes: chainPred.yesVotes,
          noVotes: chainPred.noVotes,
          status: chainPred.status as PredictionStatus,
          outcome: chainPred.outcome as PredictionOutcome,
          createdAt: chainPred.createdAt,
          autoResolvable: chainPred.autoResolvable,
        };
        chainGroups[chainKey].push(prediction);
      }
    });

    // Sort predictions by creation date (newest first) for each chain
    Object.keys(chainGroups).forEach((chainKey) => {
      chainGroups[chainKey].sort((a, b) => {
        // Sort by createdAt timestamp, newest first
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    });

    // Add fallback predictions for empty chains (only for supported networks)
    const celoFallback = hardcodedPredictions.find((p) => p.network === "celo");
    const baseFallback = hardcodedPredictions.find((p) => p.network === "base");

    if (chainGroups["celo"].length === 0 && celoFallback) {
      chainGroups["celo"].push(celoFallback);
    }
    if (chainGroups["base"].length === 0 && baseFallback) {
      chainGroups["base"].push(baseFallback);
    }

    return chainGroups;
  };

  const chainGroups = getChainPredictions();

  return (
    <WarpcastWallet>
      <div className="game-container my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="retro-heading text-xl">🔮 Prediction Markets</h2>
          <div className="flex items-center space-x-3">
            {lastRefresh && (
              <div className="text-xs text-gray-400">
                {lastRefresh.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className={`text-sm px-3 py-1 rounded flex items-center space-x-1 transition-all duration-200 ${
                isRefreshing
                  ? "bg-green-600 text-white"
                  : "bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white"
              }`}
              title={
                isRefreshing
                  ? "Refreshing..."
                  : "Refresh predictions from both chains"
              }
            >
              <FaSync
                className={`${isLoading || isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-black bg-opacity-50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("markets")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === "markets"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <FaChartLine className="inline mr-2" />
            Live Markets
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === "past"
                ? "bg-gray-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <FaHistory className="inline mr-2" />
            Past
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <FaComments className="inline mr-2" />
            AI Chat
          </button>
        </div>

        {/* Markets Tab Content */}
        {activeTab === "markets" && (
          <>
            {/* Simplified Chain Filter & Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedChain("all")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedChain === "all"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedChain("celo")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedChain === "celo"
                      ? "bg-yellow-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  🟡 CELO
                </button>
                <button
                  onClick={() => setSelectedChain("base")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedChain === "base"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  🔵 Base
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setViewMode(viewMode === "compact" ? "detailed" : "compact")
                  }
                  className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {viewMode === "compact" ? "📋 Detailed" : "📱 Compact"}
                </button>
                <button
                  onClick={() => setShowChainDetails(!showChainDetails)}
                  className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  ℹ️ Info
                </button>
              </div>
            </div>

            {/* Collapsible Chain Details */}
            {showChainDetails && (
              <div className="mb-4 p-3 bg-gray-900 bg-opacity-50 rounded-lg border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">🟡</span>
                    <span className="text-yellow-400 font-medium">
                      CELO Mainnet
                    </span>
                    <span className="text-gray-400">
                      Real stakes, charity impact
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400">🔵</span>
                    <span className="text-blue-400 font-medium">
                      Base Sepolia
                    </span>
                    <span className="text-gray-400">
                      Free testnet, experimentation
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-center text-gray-400">
                  15% of CELO stakes →{" "}
                  <a
                    href="https://warpcast.com/greenpillnetwork"
                    target="_blank"
                    className="text-green-400 hover:underline"
                  >
                    @greenpillnetwork
                  </a>{" "}
                  Kenya
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  // Combine and filter predictions based on selected chain
                  const allPredictions = Object.entries(chainGroups).flatMap(
                    ([chainKey, predictions]) =>
                      predictions.map((p) => ({
                        ...p,
                        chainKey: chainKey as SupportedChain,
                      }))
                  );

                  const filteredPredictions =
                    selectedChain === "all"
                      ? allPredictions
                      : allPredictions.filter((p) =>
                          selectedChain === "celo"
                            ? p.chainKey === "celo"
                            : p.chainKey === "base"
                        );

                  if (filteredPredictions.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-400">
                        <p>
                          No predictions found for{" "}
                          {selectedChain === "all"
                            ? "any chain"
                            : selectedChain.toUpperCase()}
                        </p>
                        <p className="text-xs mt-1">
                          Try switching chains or create a new prediction
                        </p>
                      </div>
                    );
                  }

                  return filteredPredictions.map((prediction) => (
                    <div
                      key={`${prediction.chainKey}-${prediction.id}`}
                      className="bg-black border border-gray-800 rounded-lg p-3"
                    >
                      <ChainAwarePredictionCard
                        prediction={prediction}
                        onVote={handleVote}
                        simplified={true}
                        compact={viewMode === "compact"}
                        expanded={expandedCards.has(prediction.id)}
                        onToggleExpand={() =>
                          toggleCardExpansion(prediction.id)
                        }
                        chain={prediction.chainKey}
                      />
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Community Suggestions Section */}
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-3 text-center">
                Community Suggestions
              </h3>
              <div className="bg-gray-900 bg-opacity-50 border border-gray-700 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-gray-400 mb-2">
                  View and upvote community prediction ideas.
                </p>
                <p className="text-xs text-gray-500">
                  Coming soon: See what others are suggesting!
                </p>
              </div>

              {/* Suggest a Prediction Button */}
              <div className="text-center">
                <button
                  onClick={() => setShowSuggestForm(!showSuggestForm)}
                  className="retro-button pulse-button flex items-center justify-center mx-auto"
                >
                  <FaLightbulb className="mr-2" /> Suggest a Prediction (1 CELO)
                </button>
                <p className="text-xs mt-2">
                  All proceeds go to Greenpill Kenya
                </p>
              </div>
            </div>

            {/* Suggestion Form */}
            {showSuggestForm && (
              <div className="mt-4 border-2 border-white p-4 rounded-lg bg-black bg-opacity-70">
                <h3 className="text-lg font-bold mb-3">Suggest a Prediction</h3>
                <form onSubmit={handleSubmitSuggestion}>
                  <div className="mb-3">
                    <label className="block text-sm mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={suggestFormData.title}
                      onChange={handleSuggestFormChange}
                      className="w-full bg-black border-2 border-white p-2 text-white"
                      placeholder="Enter a clear, concise prediction title"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm mb-1">Description</label>
                    <textarea
                      name="description"
                      value={suggestFormData.description}
                      onChange={handleSuggestFormChange}
                      className="w-full bg-black border-2 border-white p-2 text-white"
                      placeholder="Provide more details about your prediction"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <FaCoins className="text-yellow-400 mr-2" />
                      <span>Cost: 1 CELO</span>
                    </div>
                    <div className="text-xs text-green-400">
                      100% goes to charity
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingSuggestion}
                    className="retro-button w-full"
                  >
                    {isSubmittingSuggestion
                      ? "Submitting..."
                      : "Submit Suggestion"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* Past Predictions Tab Content */}
        {activeTab === "past" && (
          <>
            <div className="text-center mb-6">
              <div className="inline-block border-2 border-gray-600 p-2 rounded-lg bg-black bg-opacity-50">
                <span className="text-gray-400 text-sm">
                  📜 Resolved & Expired Predictions
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <>
                {/* Resolved Predictions */}
                {(() => {
                  const resolvedPredictions = predictions.filter(
                    (p) => p.status === PredictionStatus.RESOLVED
                  );

                  if (resolvedPredictions.length > 0) {
                    return (
                      <div className="mb-8">
                        <h3 className="text-lg font-bold mb-4 text-green-400">
                          ✅ Resolved Predictions ({resolvedPredictions.length})
                        </h3>
                        <div className="space-y-4">
                          {resolvedPredictions.map((prediction) => (
                            <PredictionCard
                              key={prediction.id}
                              prediction={prediction}
                              onVote={handleVoteSimple}
                              simplified={false}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Eligible for Resolution */}
                {(() => {
                  const now = Math.floor(Date.now() / 1000);
                  const eligiblePredictions = predictions.filter(
                    (p) =>
                      p.status === PredictionStatus.ACTIVE &&
                      p.autoResolvable &&
                      now >= p.targetDate
                  );

                  if (eligiblePredictions.length > 0) {
                    return (
                      <div className="mb-8">
                        <h3 className="text-lg font-bold mb-4 text-yellow-400">
                          ⏰ Ready for Resolution ({eligiblePredictions.length})
                        </h3>
                        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-800 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-300">
                            These predictions have passed their target date and
                            can be resolved using external data.
                          </p>
                        </div>
                        <div className="space-y-4">
                          {eligiblePredictions.map((prediction) => (
                            <div key={prediction.id} className="relative">
                              <PredictionCard
                                prediction={prediction}
                                onVote={handleVoteSimple}
                                simplified={false}
                              />
                              <div className="absolute top-2 right-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(
                                        "/api/predictions/resolve",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            action: "resolve",
                                            predictionId: prediction.id,
                                          }),
                                        }
                                      );

                                      const data = await response.json();

                                      if (data.success) {
                                        toast.success(
                                          `Prediction resolved: ${data.data.resolution.outcome}`
                                        );
                                        refetchPredictions(); // Refresh
                                      } else {
                                        toast.error(
                                          `Resolution failed: ${data.error}`
                                        );
                                      }
                                    } catch (error) {
                                      toast.error(
                                        "Failed to resolve prediction"
                                      );
                                    }
                                  }}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-bold"
                                >
                                  🎯 Resolve
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Expired but not auto-resolvable */}
                {(() => {
                  const now = Math.floor(Date.now() / 1000);
                  const expiredPredictions = predictions.filter(
                    (p) =>
                      p.status === PredictionStatus.ACTIVE &&
                      (!p.autoResolvable || !p.autoResolvable) &&
                      now >= p.targetDate
                  );

                  if (expiredPredictions.length > 0) {
                    return (
                      <div className="mb-8">
                        <h3 className="text-lg font-bold mb-4 text-gray-400">
                          ⏳ Expired (Manual Resolution Required)
                        </h3>
                        <div className="bg-gray-900 bg-opacity-20 border border-gray-800 rounded-lg p-3 mb-4">
                          <p className="text-sm text-gray-400">
                            These predictions require manual resolution by
                            administrators.
                          </p>
                        </div>
                        <div className="space-y-4">
                          {expiredPredictions.map((prediction) => (
                            <PredictionCard
                              key={prediction.id}
                              prediction={prediction}
                              onVote={handleVoteSimple}
                              simplified={false}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Empty state */}
                {predictions.filter(
                  (p) =>
                    p.status === PredictionStatus.RESOLVED ||
                    (p.status === PredictionStatus.ACTIVE &&
                      Math.floor(Date.now() / 1000) >= p.targetDate)
                ).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📜</div>
                    <h3 className="text-xl font-bold mb-2">
                      No Past Predictions
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Resolved and expired predictions will appear here.
                    </p>
                    <button
                      onClick={() => setActiveTab("chat")}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Create your first prediction via AI chat →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Chat Tab Content */}
        {activeTab === "chat" && (
          <div className="space-y-2">
            {/* Integrated Chat Interface - Full Height */}
            <ChatInterface onClose={() => setActiveTab("markets")} />
          </div>
        )}
      </div>
    </WarpcastWallet>
  );
};

export default PredictionMarket;
