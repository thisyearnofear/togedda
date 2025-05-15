"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import { useState, useEffect, useCallback } from "react";
import {
  createNewPredictionMarket,
  getAllPredictionMarkets,
  getMarketCount,
  isMarketFromFactory,
  transferFactoryOwnership,
} from "@/lib/deprecated/prediction-market-factory";
import {
  resolvePrediction,
  updatePredictionValue,
} from "@/lib/deprecated/prediction-market";

export default function PredictionMarketAdmin() {
  const { user, isSignedIn, signIn } = useSignIn({ autoSignIn: false });
  const [isLoading, setIsLoading] = useState(false);
  const [marketCount, setMarketCount] = useState(0);
  const [markets, setMarkets] = useState<string[]>([]);
  const [notification, setNotification] = useState("");
  const [showNotification, setShowNotification] = useState(false);

  // Form states
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [predictionId, setPredictionId] = useState("");
  const [predictionOutcome, setPredictionOutcome] = useState("1"); // 1 = YES, 2 = NO
  const [predictionValue, setPredictionValue] = useState("");

  const showNotificationMessage = (message: string) => {
    setNotification(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      const count = await getMarketCount();
      setMarketCount(count);

      const allMarkets = await getAllPredictionMarkets();
      setMarkets(allMarkets);
    } catch (error) {
      console.error("Error loading market data:", error);
      showNotificationMessage("Error loading market data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadMarketData();
    }
  }, [isSignedIn, loadMarketData]);

  const handleCreateMarket = async () => {
    if (!isSignedIn) {
      showNotificationMessage("Please sign in first");
      return;
    }

    setIsLoading(true);
    try {
      const newMarketAddress = await createNewPredictionMarket();
      showNotificationMessage(`New market created: ${newMarketAddress}`);
      loadMarketData();
    } catch (error) {
      console.error("Error creating market:", error);
      showNotificationMessage("Error creating market");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!isSignedIn || !newOwnerAddress) {
      showNotificationMessage("Please sign in and enter a valid address");
      return;
    }

    setIsLoading(true);
    try {
      await transferFactoryOwnership(newOwnerAddress);
      showNotificationMessage(`Ownership transferred to ${newOwnerAddress}`);
      setNewOwnerAddress("");
    } catch (error) {
      console.error("Error transferring ownership:", error);
      showNotificationMessage("Error transferring ownership");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolvePrediction = async () => {
    if (!isSignedIn || !predictionId) {
      showNotificationMessage("Please sign in and enter a prediction ID");
      return;
    }

    setIsLoading(true);
    try {
      await resolvePrediction(
        parseInt(predictionId),
        parseInt(predictionOutcome)
      );
      showNotificationMessage(
        `Prediction ${predictionId} resolved with outcome ${
          predictionOutcome === "1" ? "YES" : "NO"
        }`
      );
      setPredictionId("");
    } catch (error) {
      console.error("Error resolving prediction:", error);
      showNotificationMessage("Error resolving prediction");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePredictionValue = async () => {
    if (!isSignedIn || !predictionId || !predictionValue) {
      showNotificationMessage(
        "Please sign in and enter prediction ID and value"
      );
      return;
    }

    setIsLoading(true);
    try {
      await updatePredictionValue(
        parseInt(predictionId),
        parseInt(predictionValue)
      );
      showNotificationMessage(
        `Prediction ${predictionId} value updated to ${predictionValue}`
      );
      setPredictionId("");
      setPredictionValue("");
    } catch (error) {
      console.error("Error updating prediction value:", error);
      showNotificationMessage("Error updating prediction value");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="game-container my-8 p-4">
        <h2 className="retro-heading text-xl mb-4">Prediction Market Admin</h2>
        <p className="mb-4">You need to sign in to access admin functions.</p>
        <button className="retro-button" onClick={signIn}>
          Sign In with Farcaster
        </button>
      </div>
    );
  }

  return (
    <div className="game-container my-8 p-4 relative">
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
        {notification}
      </div>

      <h2 className="retro-heading text-xl mb-4">Prediction Market Admin</h2>

      <div className="mb-6">
        <p className="mb-2">
          Factory Address:{" "}
          <span className="text-yellow-400">
            0x668331bC0F8fAC8F7F79b3874197d6255de2Ccf9
          </span>
        </p>
        <p className="mb-2">
          Market Count: <span className="text-yellow-400">{marketCount}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create New Market */}
        <div className="game-container p-4">
          <h3 className="text-lg mb-4">Create New Market</h3>
          <button
            className="retro-button w-full"
            onClick={handleCreateMarket}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create New Prediction Market"}
          </button>
        </div>

        {/* Transfer Ownership */}
        <div className="game-container p-4">
          <h3 className="text-lg mb-4">Transfer Factory Ownership</h3>
          <input
            type="text"
            className="w-full bg-black border-2 border-white p-2 text-white mb-4"
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
            placeholder="New owner address (0x...)"
          />
          <button
            className="retro-button w-full"
            onClick={handleTransferOwnership}
            disabled={isLoading || !newOwnerAddress}
          >
            {isLoading ? "Transferring..." : "Transfer Ownership"}
          </button>
        </div>

        {/* Resolve Prediction */}
        <div className="game-container p-4">
          <h3 className="text-lg mb-4">Resolve Prediction</h3>
          <input
            type="number"
            className="w-full bg-black border-2 border-white p-2 text-white mb-4"
            value={predictionId}
            onChange={(e) => setPredictionId(e.target.value)}
            placeholder="Prediction ID"
          />
          <select
            className="w-full bg-black border-2 border-white p-2 text-white mb-4"
            value={predictionOutcome}
            onChange={(e) => setPredictionOutcome(e.target.value)}
          >
            <option value="1">YES</option>
            <option value="2">NO</option>
          </select>
          <button
            className="retro-button w-full"
            onClick={handleResolvePrediction}
            disabled={isLoading || !predictionId}
          >
            {isLoading ? "Resolving..." : "Resolve Prediction"}
          </button>
        </div>

        {/* Update Prediction Value */}
        <div className="game-container p-4">
          <h3 className="text-lg mb-4">Update Prediction Value</h3>
          <input
            type="number"
            className="w-full bg-black border-2 border-white p-2 text-white mb-4"
            value={predictionId}
            onChange={(e) => setPredictionId(e.target.value)}
            placeholder="Prediction ID"
          />
          <input
            type="number"
            className="w-full bg-black border-2 border-white p-2 text-white mb-4"
            value={predictionValue}
            onChange={(e) => setPredictionValue(e.target.value)}
            placeholder="New current value"
          />
          <button
            className="retro-button w-full"
            onClick={handleUpdatePredictionValue}
            disabled={isLoading || !predictionId || !predictionValue}
          >
            {isLoading ? "Updating..." : "Update Value"}
          </button>
        </div>
      </div>

      {/* Markets List */}
      <div className="mt-8">
        <h3 className="text-lg mb-4">Deployed Markets</h3>
        <div className="game-container p-4">
          {markets.length > 0 ? (
            <ul className="space-y-2">
              {markets.map((market, index) => (
                <li key={index} className="text-sm">
                  {index + 1}. <span className="text-yellow-400">{market}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No markets found</p>
          )}
        </div>
      </div>
    </div>
  );
}
