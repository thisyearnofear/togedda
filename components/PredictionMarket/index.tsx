"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import {
  getAllPredictions,
  Prediction,
  PredictionStatus,
  PredictionCategory,
  PredictionOutcome,
  voteOnPrediction,
} from "@/lib/prediction-market-v2";
import PredictionCard from "./PredictionCard";
import { FaLightbulb, FaCoins } from "react-icons/fa";
import { sdk } from "@farcaster/frame-sdk";

const PredictionMarket: React.FC = () => {
  const { address } = useAccount();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestFormData, setSuggestFormData] = useState({
    title: "",
    description: "",
  });
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  // Network information
  const networks = [
    { id: "celo", name: "Celo Mainnet", emoji: "🟡", color: "celo" },
    { id: "polygon", name: "Polygon Mainnet", emoji: "🟣", color: "polygon" },
    { id: "base", name: "Base Sepolia", emoji: "🔵", color: "base-chain" },
    { id: "monad", name: "Monad Testnet", emoji: "⚫", color: "monad" },
  ];

  useEffect(() => {
    // Call Farcaster SDK ready
    const initFarcaster = async () => {
      try {
        await sdk.actions.ready();
        console.log("Farcaster SDK ready called from PredictionMarket");
      } catch (error) {
        console.error("Error calling Farcaster SDK ready:", error);
      }
    };

    initFarcaster();
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setIsLoading(true);
      const allPredictions = await getAllPredictions();
      setPredictions(allPredictions);
    } catch (error) {
      console.error("Error loading predictions:", error);
      toast.error("Failed to load predictions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = () => {
    // Refresh predictions after voting
    loadPredictions();
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
      await voteOnPrediction(0, true, 1); // Using a special ID (0) to indicate a suggestion fee

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

  // Use the predictions from the contract or fallback to hardcoded ones
  const networkPredictions = networks.map((network, index) => {
    // Try to find a matching prediction from the blockchain
    const contractPrediction = predictions.find(
      (p) =>
        p.network.toLowerCase() === network.id.toLowerCase() &&
        p.status === PredictionStatus.ACTIVE
    );

    // If found, use it; otherwise use the hardcoded one
    return contractPrediction
      ? [contractPrediction]
      : [hardcodedPredictions[index]];
  });

  return (
    <div className="game-container my-8">
      <h2 className="retro-heading text-xl mb-6">Prediction Markets</h2>

      <div className="text-center mb-6">
        <p className="text-sm mb-4">
          Stake CELO on fitness goals. 15% of all stakes go to charity.
        </p>
        <div className="inline-block border-2 border-white p-3 rounded-lg bg-black bg-opacity-50">
          <span className="text-yellow-400">🏆 Do well by doing good!</span>
        </div>
      </div>

      <div className="bg-green-900 bg-opacity-20 border border-green-800 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-bold text-green-400 mb-2">
          Charitable Impact
        </h2>
        <p className="text-gray-300">
          15% of all stakes go directly to{" "}
          <a
            href="https://explorer.gitcoin.co/#/round/42220/31/57"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 underline"
          >
            Greenpill Kenya
          </a>{" "}
          - a network-society that exports regenerative digital infrastructure
          to the world.
        </p>
        <p className="text-gray-300 mt-2">
          Follow them on Farcaster:{" "}
          <a
            href="https://warpcast.com/greenpillnetwork"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 underline"
          >
            @greenpillnetwork
          </a>
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {networks.map((network, index) => (
            <div
              key={network.id}
              className={`border-2 border-${network.color} rounded-lg p-4 bg-black bg-opacity-70`}
            >
              <div className="flex items-center mb-2">
                <div
                  className={`w-10 h-10 rounded-full bg-${network.color} flex items-center justify-center mr-3`}
                >
                  <span className="text-xl">{network.emoji}</span>
                </div>
                <h3 className="text-lg font-bold">{network.name}</h3>
              </div>

              {networkPredictions[index].length > 0 ? (
                <PredictionCard
                  prediction={networkPredictions[index][0]}
                  onVote={handleVote}
                  simplified={true}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">
                    No active predictions for {network.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {hardcodedPredictions[index].title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggest a Prediction Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setShowSuggestForm(!showSuggestForm)}
          className="retro-button pulse-button flex items-center justify-center mx-auto"
        >
          <FaLightbulb className="mr-2" /> Suggest a Prediction (1 CELO)
        </button>
        <p className="text-xs mt-2">All proceeds go to Greenpill Kenya</p>
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
              <div className="text-xs text-green-400">100% goes to charity</div>
            </div>
            <button
              type="submit"
              disabled={isSubmittingSuggestion}
              className="retro-button w-full"
            >
              {isSubmittingSuggestion ? "Submitting..." : "Submit Suggestion"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PredictionMarket;
