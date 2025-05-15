"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import { formatNumber } from "@/lib/utils";
import { sendFrameNotification } from "@/lib/notification-client";
import { NETWORK_COLORS } from "@/lib/constants";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  createPrediction as createOnchainPrediction,
  voteOnPrediction,
  getAllPredictions,
  getUserVote,
  claimReward,
  PredictionCategory,
  formatPredictionDate,
  calculateOdds as calculateContractOdds,
} from "@/lib/prediction-market";

interface Prediction {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  targetValue: number;
  currentValue: number;
  votes: {
    yes: number;
    no: number;
  };
  userVote?: "yes" | "no";
  creator?: {
    fid: string;
    username: string;
    avatar: string;
  };
  network?: string; // Associated blockchain network
  staked?: number; // Amount staked on this prediction
  participants: string[]; // FIDs of participants
  category: "fitness" | "chain" | "community" | "custom"; // Category of prediction
  emoji: string; // Emoji representing the prediction
  resolved?: boolean; // Whether the prediction has been resolved
  outcome?: "yes" | "no"; // The outcome of the prediction if resolved
}

interface CreatePredictionFormData {
  title: string;
  description: string;
  targetDate: string;
  category: "fitness" | "chain" | "community" | "custom";
  network?: string;
  targetValue?: number;
  emoji: string;
}

export default function PredictionMarket() {
  const { user, isSignedIn, signIn } = useSignIn({ autoSignIn: false });
  const { context } = useMiniKit();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreatePredictionFormData>({
    title: "",
    description: "",
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    category: "fitness",
    emoji: "🏋️",
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(
    null
  );
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOption, setSortOption] = useState<"date" | "votes" | "network">(
    "date"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const predictionsPerPage = 5;
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const confettiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sample emojis for different categories
  const categoryEmojis = {
    fitness: ["🏋️", "🏃", "💪", "🧘", "🤸"],
    chain: ["⛓️", "🔗", "🟣", "🟡", "🔵"],
    community: ["👥", "🤝", "🌐", "🏆", "🎯"],
    custom: ["🎲", "🎮", "🎪", "🎨", "🎭"],
  };

  const [predictions, setPredictions] = useState<Prediction[]>([
    {
      id: "mount-olympus-2023",
      title: "Mount Olympus Challenge",
      description:
        "Will we reach 50% of Mount Olympus (145,850 push-ups) by the end of the month?",
      targetDate: "2023-12-31",
      targetValue: 145850,
      currentValue: 78500,
      votes: {
        yes: 124,
        no: 45,
      },
      network: "polygon",
      staked: 450,
      participants: ["1234", "5678", "9012"],
      category: "fitness",
      emoji: "🏔️",
      resolved: false,
    },
    {
      id: "kenya-run-2023",
      title: "Kenya Run Challenge",
      description:
        "Will we reach 25% of Kenya Run (257,500 squats) by the end of the month?",
      targetDate: "2023-12-31",
      targetValue: 257500,
      currentValue: 98700,
      votes: {
        yes: 87,
        no: 112,
      },
      network: "celo",
      staked: 320,
      participants: ["2345", "6789", "1023"],
      category: "fitness",
      emoji: "🏃",
      resolved: false,
    },
    {
      id: "polygon-dominance",
      title: "Polygon Dominance",
      description:
        "Will Polygon contribute more than all other chains combined by the end of the month?",
      targetDate: "2023-12-31",
      targetValue: 0,
      currentValue: 0,
      votes: {
        yes: 56,
        no: 89,
      },
      network: "polygon",
      staked: 210,
      participants: ["3456", "7890", "1234"],
      category: "chain",
      emoji: "🟣",
      resolved: false,
    },
    {
      id: "base-milestone-2023",
      title: "Base Milestone",
      description:
        "Will Base reach 1 million daily active users by the end of 2023?",
      targetDate: "2023-12-31",
      targetValue: 1000000,
      currentValue: 950000,
      votes: {
        yes: 156,
        no: 42,
      },
      network: "base",
      staked: 580,
      participants: ["1234", "5678", "9012", "3456"],
      category: "chain",
      emoji: "🔵",
      resolved: true,
      outcome: "yes",
    },
  ]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  // Load predictions from blockchain
  const loadPredictions = useCallback(async () => {
    try {
      setIsLoading(true);
      showNotificationMessage("Loading predictions from blockchain...");
      const onchainPredictions = await getAllPredictions();

      // Convert blockchain predictions to our format
      const formattedPredictions: Prediction[] = onchainPredictions.map(
        (p) => ({
          id: p.id.toString(),
          title: p.title,
          description: p.description,
          targetDate: new Date(p.targetDate * 1000).toISOString().split("T")[0],
          targetValue: p.targetValue,
          currentValue: p.currentValue,
          votes: {
            yes: p.yesVotes,
            no: p.noVotes,
          },
          network: p.network,
          staked: p.totalStaked,
          participants: [], // We'll need to fetch this separately if needed
          category: getCategoryString(p.category),
          emoji: p.emoji,
          creator: {
            fid: p.creator,
            username: "User " + p.creator.substring(0, 6),
            avatar: "https://via.placeholder.com/50",
          },
          // Set resolved status based on blockchain data
          resolved: p.status === 1, // 1 = RESOLVED in the contract
          outcome: p.outcome === 1 ? "yes" : p.outcome === 2 ? "no" : undefined, // 1 = YES, 2 = NO in the contract
        })
      );

      // Always replace mock data with real data, even if empty
      setPredictions(formattedPredictions);

      if (formattedPredictions.length > 0) {
        showNotificationMessage(
          `Loaded ${formattedPredictions.length} predictions`
        );
      } else {
        showNotificationMessage("No predictions found. Create the first one!");
      }
    } catch (error) {
      console.error("Failed to load predictions:", error);
      showNotificationMessage("Failed to load predictions from blockchain");
      // Reset to empty array on error to avoid showing mock data
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convert category enum to string
  const getCategoryString = (
    category: PredictionCategory
  ): "fitness" | "chain" | "community" | "custom" => {
    switch (category) {
      case PredictionCategory.FITNESS:
        return "fitness";
      case PredictionCategory.CHAIN:
        return "chain";
      case PredictionCategory.COMMUNITY:
        return "community";
      case PredictionCategory.CUSTOM:
        return "custom";
      default:
        return "custom";
    }
  };

  // Convert category string to enum
  const getCategoryEnum = (category: string): PredictionCategory => {
    switch (category) {
      case "fitness":
        return PredictionCategory.FITNESS;
      case "chain":
        return PredictionCategory.CHAIN;
      case "community":
        return PredictionCategory.COMMUNITY;
      case "custom":
        return PredictionCategory.CUSTOM;
      default:
        return PredictionCategory.CUSTOM;
    }
  };

  // Load predictions on component mount
  useEffect(() => {
    if (isSignedIn) {
      loadPredictions();
    }
  }, [isSignedIn, loadPredictions]);

  // Sort and paginate predictions
  const getSortedAndPaginatedPredictions = useCallback(() => {
    // First sort the predictions
    let sortedPredictions = [...predictions];

    switch (sortOption) {
      case "date":
        sortedPredictions.sort(
          (a, b) =>
            new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()
        );
        break;
      case "votes":
        sortedPredictions.sort(
          (a, b) => b.votes.yes + b.votes.no - (a.votes.yes + a.votes.no)
        );
        break;
      case "network":
        sortedPredictions.sort((a, b) =>
          (a.network || "").localeCompare(b.network || "")
        );
        break;
    }

    // Then paginate
    const startIndex = (currentPage - 1) * predictionsPerPage;
    const endIndex = startIndex + predictionsPerPage;
    return sortedPredictions.slice(startIndex, endIndex);
  }, [predictions, sortOption, currentPage, predictionsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(predictions.length / predictionsPerPage);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleVote = async (id: string, vote: "yes" | "no") => {
    if (!isSignedIn) {
      showNotificationMessage("Please sign in to vote!");
      return;
    }

    try {
      showNotificationMessage("Submitting your vote to the blockchain...");

      // Default stake amount - in a real app, you'd let the user choose this
      const stakeAmount = 0.01; // 0.01 CELO

      // Submit vote to blockchain
      await voteOnPrediction(parseInt(id), vote === "yes", stakeAmount);

      // Optimistically update UI
      setPredictions((prev) =>
        prev.map((prediction) => {
          if (prediction.id === id) {
            // If user already voted, remove their vote first
            const prevVote = prediction.userVote;
            const updatedVotes = { ...prediction.votes };

            if (prevVote) {
              updatedVotes[prevVote] -= 1;
            }

            // Add new vote
            updatedVotes[vote] += 1;

            // Add user to participants if not already there
            let updatedParticipants = [...prediction.participants];
            if (user && !updatedParticipants.includes(user.fid)) {
              updatedParticipants.push(user.fid);
            }

            return {
              ...prediction,
              votes: updatedVotes,
              userVote: vote,
              participants: updatedParticipants,
              staked: (prediction.staked || 0) + stakeAmount,
            };
          }
          return prediction;
        })
      );

      // Show voting animation
      setShowConfetti(true);
      confettiTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      // Show notification
      showNotificationMessage(`Vote recorded: ${vote.toUpperCase()}!`);

      // Send notification to other participants
      if (user && context?.user?.fid) {
        try {
          const prediction = predictions.find((p) => p.id === id);
          if (prediction) {
            // Notify creator if it exists
            if (prediction.creator && prediction.creator.fid !== user.fid) {
              await sendFrameNotification({
                fid: parseInt(prediction.creator.fid),
                title: "New Vote on Your Prediction",
                body: `${user.username} voted ${vote} on "${prediction.title}"`,
              });
            }

            // Notify a sample of other participants (limit to avoid spam)
            const otherParticipants = prediction.participants
              .filter((fid) => fid !== user.fid)
              .slice(0, 3); // Limit to 3 notifications

            for (const fid of otherParticipants) {
              await sendFrameNotification({
                fid: parseInt(fid),
                title: "Prediction Update",
                body: `New vote on "${prediction.title}" - current odds: ${
                  vote === "yes"
                    ? prediction.votes.yes + 1
                    : prediction.votes.yes
                }:${
                  vote === "no" ? prediction.votes.no + 1 : prediction.votes.no
                }`,
              });
            }
          }
        } catch (error) {
          console.error("Failed to send notifications:", error);
        }
      }

      // Refresh predictions from blockchain after a short delay
      setTimeout(() => {
        loadPredictions();
      }, 5000);
    } catch (error) {
      console.error("Failed to submit vote to blockchain:", error);
      showNotificationMessage("Failed to submit vote. Please try again.");
    }
  };

  const handleStake = (id: string) => {
    if (!isSignedIn) {
      showNotificationMessage("Please sign in to stake!");
      return;
    }

    setSelectedPrediction(id);
    setShowStakeModal(true);
  };

  const confirmStake = async () => {
    if (!selectedPrediction) return;

    try {
      showNotificationMessage("Staking tokens on the blockchain...");

      // In our contract, staking is done through voting
      // So we'll get the user's current vote and stake more on the same side
      // If they haven't voted yet, we'll default to "yes"
      const predictionId = parseInt(selectedPrediction);
      const userAddress = user?.custody_address || "";

      let voteYes = true;

      try {
        // Try to get the user's current vote
        if (userAddress) {
          const userVote = await getUserVote(predictionId, userAddress);
          if (userVote && userVote.amount > 0) {
            voteYes = userVote.isYes;
          }
        }
      } catch (error) {
        console.error("Error getting user vote:", error);
        // Default to "yes" if we can't get the user's vote
      }

      // Submit stake to blockchain (which is a vote with tokens)
      await voteOnPrediction(predictionId, voteYes, stakeAmount);

      // Optimistically update UI
      setPredictions((prev) =>
        prev.map((prediction) => {
          if (prediction.id === selectedPrediction) {
            // Also update the vote counts
            const updatedVotes = { ...prediction.votes };
            if (voteYes) {
              updatedVotes.yes += stakeAmount;
            } else {
              updatedVotes.no += stakeAmount;
            }

            return {
              ...prediction,
              staked: (prediction.staked || 0) + stakeAmount,
              votes: updatedVotes,
              userVote: voteYes ? "yes" : "no",
            };
          }
          return prediction;
        })
      );

      setShowStakeModal(false);
      setSelectedPrediction(null);

      // Show staking animation
      setShowConfetti(true);
      confettiTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      showNotificationMessage(`You staked ${stakeAmount} CELO tokens!`);

      // Refresh predictions from blockchain after a short delay
      setTimeout(() => {
        loadPredictions();
      }, 5000);
    } catch (error) {
      console.error("Failed to stake tokens on blockchain:", error);
      showNotificationMessage("Failed to stake tokens. Please try again.");
      setShowStakeModal(false);
    }
  };

  const handleCreatePrediction = async () => {
    if (!isSignedIn) {
      showNotificationMessage("Please sign in to create a prediction!");
      return;
    }

    if (!formData.title || !formData.description || !formData.targetDate) {
      showNotificationMessage("Please fill all required fields!");
      return;
    }

    try {
      showNotificationMessage("Creating prediction on the blockchain...");

      // Convert date string to timestamp
      const targetDate = new Date(formData.targetDate);

      // Create prediction on blockchain
      const predictionId = await createOnchainPrediction(
        formData.title,
        formData.description,
        targetDate,
        formData.targetValue || 0,
        getCategoryEnum(formData.category),
        formData.network || "celo",
        formData.emoji
      );

      // Optimistically update UI
      const newPrediction: Prediction = {
        id: predictionId.toString(),
        title: formData.title,
        description: formData.description,
        targetDate: formData.targetDate,
        targetValue: formData.targetValue || 0,
        currentValue: 0,
        votes: {
          yes: 0,
          no: 0,
        },
        network: formData.network,
        staked: 0,
        participants: user ? [user.fid] : [],
        category: formData.category,
        emoji: formData.emoji,
        creator: user
          ? {
              fid: user.fid,
              username: user.username,
              avatar: user.pfp_url,
            }
          : undefined,
      };

      setPredictions((prev) => [newPrediction, ...prev]);
      setShowCreateForm(false);

      // Reset form
      setFormData({
        title: "",
        description: "",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "fitness",
        emoji: "🏋️",
      });

      // Show success animation
      setShowConfetti(true);
      confettiTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      showNotificationMessage(
        "Prediction created successfully on the blockchain!"
      );

      // Refresh predictions from blockchain after a short delay
      setTimeout(() => {
        loadPredictions();
      }, 5000);
    } catch (error) {
      console.error("Failed to create prediction on blockchain:", error);
      showNotificationMessage("Failed to create prediction. Please try again.");
    }
  };

  // Handle claiming rewards for resolved predictions
  const handleClaimReward = async (id: string) => {
    if (!isSignedIn) {
      showNotificationMessage("Please sign in to claim rewards!");
      return;
    }

    try {
      showNotificationMessage("Claiming your rewards from the blockchain...");

      // Claim reward from blockchain
      await claimReward(parseInt(id));

      // Show success animation
      setShowConfetti(true);
      confettiTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      showNotificationMessage("Rewards claimed successfully!");

      // Refresh predictions from blockchain after a short delay
      setTimeout(() => {
        loadPredictions();
      }, 5000);
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      showNotificationMessage("Failed to claim rewards. Please try again.");
    }
  };

  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateOdds = (yes: number, no: number) => {
    const total = yes + no;
    if (total === 0) return { yes: 50, no: 50 };

    const yesPercentage = Math.round((yes / total) * 100);
    return {
      yes: yesPercentage,
      no: 100 - yesPercentage,
    };
  };

  const getNetworkColor = (network?: string) => {
    if (!network) return "#ffffff";
    return NETWORK_COLORS[network as keyof typeof NETWORK_COLORS] || "#ffffff";
  };

  const handleEmojiSelect = (emoji: string) => {
    setFormData((prev) => ({ ...prev, emoji }));
  };

  // Add keyframe animation for spinner
  const spinnerStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <div className="game-container my-8 relative">
      {/* Add spinner animation */}
      <style>{spinnerStyle}</style>

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Notification Toast */}
      <div
        className={`notification-toast ${showNotification ? "show" : ""}`}
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          zIndex: 1000,
          border: "2px solid white",
          boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
          transition: "all 0.3s ease",
          opacity: showNotification ? 1 : 0,
          pointerEvents: showNotification ? "auto" : "none",
        }}
      >
        {notificationMessage}
      </div>

      {/* Staking Modal */}
      {showStakeModal && (
        <div className="modal-overlay">
          <div className="modal-content game-container">
            <h3 className="text-lg mb-4">Stake Your Tokens</h3>
            <p className="mb-4">How many tokens would you like to stake?</p>

            <div className="flex items-center justify-center mb-6">
              <button
                className="retro-button"
                onClick={() => setStakeAmount(Math.max(1, stakeAmount - 5))}
              >
                -
              </button>
              <span className="mx-4 text-xl">{stakeAmount}</span>
              <button
                className="retro-button"
                onClick={() => setStakeAmount(stakeAmount + 5)}
              >
                +
              </button>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                className="retro-button"
                onClick={() => setShowStakeModal(false)}
              >
                Cancel
              </button>
              <button
                className="retro-button retro-button-celo"
                onClick={confirmStake}
              >
                Confirm Stake
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="retro-heading text-xl">Prediction Market</h2>
        {isSignedIn ? (
          <button
            className="retro-button pulse-animation"
            onClick={() => setShowCreateForm(true)}
          >
            + New Prediction
          </button>
        ) : (
          <button className="retro-button" onClick={signIn}>
            Sign In to Create
          </button>
        )}
      </div>

      {/* Create Prediction Form */}
      {showCreateForm && (
        <div className="game-container mb-8 border-4 border-yellow-400 p-4 animate-fadeIn">
          <h3 className="text-lg mb-4 text-center">Create New Prediction</h3>

          <div className="mb-4">
            <label className="block text-sm mb-1">Title:</label>
            <input
              type="text"
              className="w-full bg-black border-2 border-white p-2 text-white"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter prediction title"
              maxLength={50}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-1">Description:</label>
            <textarea
              className="w-full bg-black border-2 border-white p-2 text-white"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your prediction"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">End Date:</label>
              <input
                type="date"
                className="w-full bg-black border-2 border-white p-2 text-white"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Category:</label>
              <select
                className="w-full bg-black border-2 border-white p-2 text-white"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
              >
                <option value="fitness">Fitness Goals</option>
                <option value="chain">Chain Competition</option>
                <option value="community">Community</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-1">Network (optional):</label>
            <select
              className="w-full bg-black border-2 border-white p-2 text-white"
              value={formData.network || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  network: e.target.value || undefined,
                })
              }
            >
              <option value="">All Networks</option>
              <option value="polygon">Polygon</option>
              <option value="celo">Celo</option>
              <option value="base">Base</option>
              <option value="monad">Monad</option>
            </select>
          </div>

          {formData.category === "fitness" && (
            <div className="mb-4">
              <label className="block text-sm mb-1">
                Target Value (optional):
              </label>
              <input
                type="number"
                className="w-full bg-black border-2 border-white p-2 text-white"
                value={formData.targetValue || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetValue: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="e.g., 100000 for push-ups goal"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm mb-1">Choose an Emoji:</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {categoryEmojis[formData.category].map((emoji) => (
                <button
                  key={emoji}
                  className={`emoji-button ${
                    formData.emoji === emoji ? "selected" : ""
                  }`}
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              className="retro-button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
            <button
              className="retro-button retro-button-base"
              onClick={handleCreatePrediction}
            >
              Create Prediction
            </button>
          </div>
        </div>
      )}

      {/* Sorting and Filtering Controls */}
      <div className="mb-6 game-container p-3">
        <div className="flex flex-wrap justify-between items-center">
          <div className="mb-2 md:mb-0">
            <span className="text-sm mr-2">Sort by:</span>
            <select
              className="bg-black border-2 border-white p-1 text-white text-sm"
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value as "date" | "votes" | "network")
              }
            >
              <option value="date">Date</option>
              <option value="votes">Popularity</option>
              <option value="network">Network</option>
            </select>
          </div>
          <div className="text-sm">
            Showing{" "}
            {predictions.length > 0
              ? (currentPage - 1) * predictionsPerPage + 1
              : 0}{" "}
            - {Math.min(currentPage * predictionsPerPage, predictions.length)}{" "}
            of {predictions.length} predictions
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <div
            className="loading-spinner"
            style={{
              width: "30px",
              height: "30px",
              border: "4px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50%",
              borderTop: "4px solid white",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p className="ml-4">Loading predictions...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && predictions.length === 0 && (
        <div className="game-container p-8 text-center">
          <p className="mb-4">
            No predictions yet! Be the first to create one.
          </p>
          {isSignedIn ? (
            <button
              className="retro-button pulse-animation"
              onClick={() => setShowCreateForm(true)}
            >
              Create First Prediction
            </button>
          ) : (
            <button className="retro-button" onClick={signIn}>
              Sign In to Create
            </button>
          )}
        </div>
      )}

      {/* Predictions List */}
      {!isLoading && predictions.length > 0 && (
        <div className="space-y-8">
          {getSortedAndPaginatedPredictions().map((prediction) => {
            const progress = calculateProgress(
              prediction.currentValue,
              prediction.targetValue
            );
            const odds = calculateOdds(
              prediction.votes.yes,
              prediction.votes.no
            );
            const daysLeft = Math.ceil(
              (new Date(prediction.targetDate).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const networkColor = getNetworkColor(prediction.network);

            return (
              <div
                key={prediction.id}
                className="prediction-card border-2 border-white p-4 rounded-lg relative"
                style={{
                  boxShadow: `0 0 15px ${networkColor}40`,
                }}
              >
                {/* Network Badge */}
                {prediction.network && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full"
                    style={{ backgroundColor: networkColor }}
                  />
                )}

                {/* Creator Badge */}
                {prediction.creator && (
                  <div className="absolute top-2 left-2 flex items-center">
                    <div className="w-6 h-6 rounded-full overflow-hidden">
                      <Image
                        src={prediction.creator.avatar}
                        alt={prediction.creator.username}
                        width={24}
                        height={24}
                      />
                    </div>
                  </div>
                )}

                {/* Category & Emoji */}
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{prediction.emoji}</span>
                  <h3 className="text-lg">{prediction.title}</h3>
                </div>

                <p className="text-sm mb-4">{prediction.description}</p>

                {prediction.targetValue > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress: {progress.toFixed(1)}%</span>
                      <span>
                        {formatNumber(prediction.currentValue)} /{" "}
                        {formatNumber(prediction.targetValue)}
                      </span>
                    </div>
                    <div className="progress-container">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: networkColor || "#ff69b4",
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">
                    <span className="text-yellow-400">
                      ⏱️ {daysLeft} days left
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-400">{odds.yes}% Yes</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-400">{odds.no}% No</span>
                  </div>
                </div>

                {/* Staking Info */}
                <div className="flex justify-between items-center mb-4 text-xs">
                  <div>
                    <span>
                      👥 {prediction.participants.length} participants
                    </span>
                  </div>
                  <div>
                    <span>💰 {prediction.staked} staked</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {/* For active predictions, show voting and staking buttons */}
                  {!prediction.resolved && (
                    <>
                      <button
                        className={`retro-button ${
                          prediction.userVote === "yes" ? "bg-green-900" : ""
                        }`}
                        onClick={() => handleVote(prediction.id, "yes")}
                      >
                        Yes ({prediction.votes.yes})
                      </button>
                      <button
                        className={`retro-button ${
                          prediction.userVote === "no" ? "bg-red-900" : ""
                        }`}
                        onClick={() => handleVote(prediction.id, "no")}
                      >
                        No ({prediction.votes.no})
                      </button>
                      <button
                        className="retro-button retro-button-celo"
                        onClick={() => handleStake(prediction.id)}
                      >
                        Stake 🪙
                      </button>
                    </>
                  )}

                  {/* For resolved predictions, show claim reward button */}
                  {prediction.resolved && (
                    <button
                      className="retro-button retro-button-celo pulse-animation"
                      onClick={() => handleClaimReward(prediction.id)}
                    >
                      Claim Reward 🏆
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && predictions.length > predictionsPerPage && (
        <div className="flex justify-center mt-6">
          <button
            className="retro-button mx-1 px-3 py-1"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ◀
          </button>

          <div className="flex items-center mx-2">
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <button
            className="retro-button mx-1 px-3 py-1"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
