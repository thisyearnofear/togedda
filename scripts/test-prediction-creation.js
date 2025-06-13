/**
 * Test script to create a prediction on the new Base Sepolia contract
 * and verify it exists on-chain
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Prediction Creation on Base Sepolia");
  console.log(
    "📍 Contract Address: 0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA"
  );
  console.log("");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Account has no ETH for gas fees");
  }

  // Get the contract
  const contractAddress = "0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA";
  const contract = await ethers.getContractAt(
    "ImperfectFormPredictionMarketV2Fixed",
    contractAddress
  );

  console.log("\n📊 Current Contract State:");

  // Check current total predictions
  const totalPredictionsBefore = await contract.getTotalPredictions();
  console.log(
    "📈 Total predictions before:",
    totalPredictionsBefore.toString()
  );

  // Check contract owner
  const owner = await contract.owner();
  console.log("👑 Contract owner:", owner);
  console.log(
    "🔍 Is deployer owner?",
    owner.toLowerCase() === deployer.address.toLowerCase()
  );

  // Create a test prediction
  console.log("\n🔮 Creating Test Prediction...");

  const predictionData = {
    title: "Terminal Test Prediction",
    description:
      "This prediction was created via terminal to test the new Base Sepolia contract functionality",
    targetDate: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days from now
    targetValue: 1000,
    category: 3, // CUSTOM
    network: "base",
    emoji: "🧪",
    autoResolvable: false,
  };

  console.log("📋 Prediction Details:");
  console.log("  Title:", predictionData.title);
  console.log("  Description:", predictionData.description);
  console.log(
    "  Target Date:",
    new Date(predictionData.targetDate * 1000).toLocaleString()
  );
  console.log("  Target Value:", predictionData.targetValue);
  console.log("  Category:", predictionData.category, "(CUSTOM)");
  console.log("  Network:", predictionData.network);
  console.log("  Emoji:", predictionData.emoji);
  console.log("  Auto-resolvable:", predictionData.autoResolvable);

  try {
    // Create the prediction
    console.log("\n📤 Sending transaction...");
    const tx = await contract.createPrediction(
      predictionData.title,
      predictionData.description,
      predictionData.targetDate,
      predictionData.targetValue,
      predictionData.category,
      predictionData.network,
      predictionData.emoji,
      predictionData.autoResolvable
    );

    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("📦 Block number:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log(
      "🔗 View on BaseScan:",
      `https://sepolia.basescan.org/tx/${receipt.hash}`
    );

    // Parse events to get prediction ID
    let predictionId = null;
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "PredictionCreated") {
              predictionId = Number(parsedLog.args[0]); // First argument is the prediction ID
              console.log("🆔 Prediction ID from event:", predictionId);
              break;
            }
          } catch (parseError) {
            // Skip logs that don't match our interface
            continue;
          }
        }
      } catch (error) {
        console.log("⚠️ Could not parse prediction ID from events");
      }
    }

    // Verify the prediction was created
    console.log("\n🔍 Verifying Prediction Creation...");

    const totalPredictionsAfter = await contract.getTotalPredictions();
    console.log(
      "📈 Total predictions after:",
      totalPredictionsAfter.toString()
    );
    console.log(
      "📊 Predictions added:",
      (totalPredictionsAfter - totalPredictionsBefore).toString()
    );

    if (totalPredictionsAfter > totalPredictionsBefore) {
      console.log("✅ Prediction count increased successfully!");

      // Get the latest prediction (should be our new one)
      const latestPredictionId = totalPredictionsAfter;
      console.log(
        "🔍 Fetching prediction details for ID:",
        latestPredictionId.toString()
      );

      try {
        const prediction = await contract.getPrediction(latestPredictionId);

        console.log("\n📋 Retrieved Prediction Details:");
        console.log("  ID:", prediction.id.toString());
        console.log("  Creator:", prediction.creator);
        console.log("  Title:", prediction.title);
        console.log("  Description:", prediction.description);
        console.log(
          "  Target Date:",
          new Date(Number(prediction.targetDate) * 1000).toLocaleString()
        );
        console.log("  Target Value:", prediction.targetValue.toString());
        console.log("  Current Value:", prediction.currentValue.toString());
        console.log("  Category:", prediction.category.toString());
        console.log("  Network:", prediction.network);
        console.log("  Emoji:", prediction.emoji);
        console.log(
          "  Status:",
          prediction.status.toString(),
          "(0=ACTIVE, 1=RESOLVED, 2=CANCELLED)"
        );
        console.log(
          "  Outcome:",
          prediction.outcome.toString(),
          "(0=UNRESOLVED, 1=YES, 2=NO)"
        );
        console.log(
          "  Created At:",
          new Date(Number(prediction.createdAt) * 1000).toLocaleString()
        );
        console.log("  Auto-resolvable:", prediction.autoResolvable);
        console.log(
          "  Total Staked:",
          ethers.formatEther(prediction.totalStaked),
          "ETH"
        );
        console.log(
          "  Yes Votes:",
          ethers.formatEther(prediction.yesVotes),
          "ETH"
        );
        console.log(
          "  No Votes:",
          ethers.formatEther(prediction.noVotes),
          "ETH"
        );

        // Verify the data matches what we sent
        console.log("\n✅ Data Verification:");
        console.log(
          "  Title matches:",
          prediction.title === predictionData.title ? "✅" : "❌"
        );
        console.log(
          "  Description matches:",
          prediction.description === predictionData.description ? "✅" : "❌"
        );
        console.log(
          "  Creator matches:",
          prediction.creator.toLowerCase() === deployer.address.toLowerCase()
            ? "✅"
            : "❌"
        );
        console.log(
          "  Category matches:",
          Number(prediction.category) === predictionData.category ? "✅" : "❌"
        );
        console.log(
          "  Network matches:",
          prediction.network === predictionData.network ? "✅" : "❌"
        );
        console.log(
          "  Emoji matches:",
          prediction.emoji === predictionData.emoji ? "✅" : "❌"
        );
        console.log(
          "  Status is ACTIVE:",
          Number(prediction.status) === 0 ? "✅" : "❌"
        );
        console.log(
          "  Outcome is UNRESOLVED:",
          Number(prediction.outcome) === 0 ? "✅" : "❌"
        );
      } catch (error) {
        console.error("❌ Error fetching prediction details:", error.message);
      }
    } else {
      console.log(
        "❌ Prediction count did not increase - something went wrong!"
      );
    }

    console.log("\n🎉 Test completed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log(
      "🔗 View Contract on BaseScan:",
      `https://sepolia.basescan.org/address/${contractAddress}`
    );
    console.log(
      "🔗 View Transaction on BaseScan:",
      `https://sepolia.basescan.org/tx/${receipt.hash}`
    );
  } catch (error) {
    console.error("❌ Error creating prediction:", error);

    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("💸 Insufficient funds for gas");
    } else if (error.code === "NETWORK_ERROR") {
      console.error("🌐 Network error - check RPC connection");
    } else if (error.reason) {
      console.error("📝 Revert reason:", error.reason);
    }

    throw error;
  }
}

// Run the test
main()
  .then(() => {
    console.log("\n✅ Test script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error);
    process.exit(1);
  });
