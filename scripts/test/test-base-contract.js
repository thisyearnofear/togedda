/**
 * Simple test to check Base Sepolia contract predictions and voting
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

// Contract configuration
const CONTRACT_ADDRESS = "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB";
const RPC_URL = "https://sepolia.base.org";

// Simple ABI for testing
const TEST_ABI = [
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "targetDate", type: "uint256" },
          { name: "targetValue", type: "uint256" },
          { name: "currentValue", type: "uint256" },
          { name: "category", type: "uint8" },
          { name: "network", type: "string" },
          { name: "emoji", type: "string" },
          { name: "totalStaked", type: "uint256" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "autoResolvable", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getTotalPredictions",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "vote",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_isYes", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "getUserVote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_user", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "isYes", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "claimed", type: "bool" },
        ],
      },
    ],
  },
];

async function testBasePredictions() {
  try {
    console.log("🔵 Testing Base Sepolia Predictions");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("");

    // Setup provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TEST_ABI, provider);

    // Get total predictions
    const totalPredictions = await contract.getTotalPredictions();
    console.log("📊 Total predictions:", totalPredictions.toString());

    // Fetch all predictions
    console.log("\n📋 All Base Sepolia Predictions:");
    for (let id = 1; id <= totalPredictions; id++) {
      try {
        const prediction = await contract.getPrediction(id);
        console.log(`\n🔵 Prediction ${id}:`);
        console.log(`  Title: ${prediction.title}`);
        console.log(`  Creator: ${prediction.creator}`);
        console.log(`  Network: "${prediction.network}"`);
        console.log(
          `  Status: ${prediction.status} (0=ACTIVE, 1=RESOLVED, 2=CANCELLED)`
        );
        console.log(
          `  Total Staked: ${ethers.formatEther(prediction.totalStaked)} ETH`
        );
        console.log(
          `  YES Votes: ${ethers.formatEther(prediction.yesVotes)} ETH`
        );
        console.log(
          `  NO Votes: ${ethers.formatEther(prediction.noVotes)} ETH`
        );
        console.log(
          `  Target Date: ${new Date(
            Number(prediction.targetDate) * 1000
          ).toISOString()}`
        );
      } catch (error) {
        console.log(`❌ Error fetching prediction ${id}:`, error.message);
      }
    }

    // Test voting if we have a private key
    const privateKey = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
    if (privateKey && totalPredictions > 0) {
      console.log("\n🗳️ Testing voting functionality...");

      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESS,
        TEST_ABI,
        wallet
      );

      console.log("👤 Wallet:", wallet.address);

      const balance = await provider.getBalance(wallet.address);
      console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

      if (balance > ethers.parseEther("0.001")) {
        // Test voting on prediction 1 with 0.001 ETH
        const testPredictionId = 1;
        const testAmount = "0.001";
        const testVote = true; // YES

        console.log(`\n🗳️ Testing vote on prediction ${testPredictionId}:`);
        console.log(`  Amount: ${testAmount} ETH`);
        console.log(`  Vote: ${testVote ? "YES" : "NO"}`);

        try {
          // Check current vote first
          const currentVote = await contract.getUserVote(
            testPredictionId,
            wallet.address
          );
          console.log("📊 Current user vote:", {
            hasVoted: currentVote.amount > 0,
            amount: ethers.formatEther(currentVote.amount),
            isYes: currentVote.isYes,
            claimed: currentVote.claimed,
          });

          // Try the vote transaction
          const tx = await contractWithSigner.vote(testPredictionId, testVote, {
            value: ethers.parseEther(testAmount),
          });

          console.log("📤 Vote transaction sent:", tx.hash);
          console.log(
            "🔗 View on BaseScan:",
            `https://sepolia.basescan.org/tx/${tx.hash}`
          );

          console.log("⏳ Waiting for confirmation...");
          const receipt = await tx.wait();

          console.log("✅ Vote confirmed!");
          console.log("📦 Block:", receipt.blockNumber);
          console.log("⛽ Gas used:", receipt.gasUsed.toString());

          // Check updated prediction
          const updatedPrediction = await contract.getPrediction(
            testPredictionId
          );
          console.log("\n📊 Updated prediction stats:");
          console.log(
            `  Total Staked: ${ethers.formatEther(
              updatedPrediction.totalStaked
            )} ETH`
          );
          console.log(
            `  YES Votes: ${ethers.formatEther(updatedPrediction.yesVotes)} ETH`
          );
          console.log(
            `  NO Votes: ${ethers.formatEther(updatedPrediction.noVotes)} ETH`
          );

          // Check updated user vote
          const updatedVote = await contract.getUserVote(
            testPredictionId,
            wallet.address
          );
          console.log("📊 Updated user vote:", {
            amount: ethers.formatEther(updatedVote.amount),
            isYes: updatedVote.isYes,
            claimed: updatedVote.claimed,
          });
        } catch (error) {
          console.log("❌ Vote failed:", error.message);
          console.log("🔍 Error details:", error);
        }
      } else {
        console.log("⚠️ Insufficient balance for voting test");
      }
    } else {
      console.log(
        "\n⚠️ No private key found or no predictions available for voting test"
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testBasePredictions()
  .then(() => {
    console.log("\n✅ Base contract test completed");
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
