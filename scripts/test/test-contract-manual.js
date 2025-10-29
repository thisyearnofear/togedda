/**
 * Manual contract testing script
 * Tests the Base Sepolia prediction market contract directly
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

// Contract configuration
const CONTRACT_ADDRESS = "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB"; // Current unified contract
const RPC_URL = "https://sepolia.base.org";
const CHAIN_ID = 84532;

// Simple ABI for testing
const TEST_ABI = [
  {
    name: "createPrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_targetDate", type: "uint256" },
      { name: "_targetValue", type: "uint256" },
      { name: "_category", type: "uint8" },
      { name: "_network", type: "string" },
      { name: "_emoji", type: "string" },
      { name: "_autoResolvable", type: "bool" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
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
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "charityAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "maintenanceAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "charityFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "maintenanceFeePercentage",
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

async function testContract() {
  try {
    console.log("🔧 Testing Base Sepolia Prediction Market Contract");
    console.log("📍 Contract Address:", CONTRACT_ADDRESS);
    console.log("🌐 RPC URL:", RPC_URL);
    console.log("⛓️ Chain ID:", CHAIN_ID);
    console.log("");

    // Setup provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Check network
    const network = await provider.getNetwork();
    console.log(
      "✅ Connected to network:",
      network.name,
      "Chain ID:",
      network.chainId.toString()
    );

    if (network.chainId.toString() !== CHAIN_ID.toString()) {
      throw new Error(
        `Wrong network! Expected ${CHAIN_ID}, got ${network.chainId}`
      );
    }

    // Check contract exists
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      throw new Error("Contract does not exist at this address");
    }
    console.log("✅ Contract exists (code length:", code.length, "bytes)");

    // Create contract instance (read-only first)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TEST_ABI, provider);

    // Test read functions
    console.log("\n📖 Testing read functions...");

    try {
      const totalPredictions = await contract.getTotalPredictions();
      console.log("📊 Total predictions:", totalPredictions.toString());
    } catch (error) {
      console.log("⚠️ getTotalPredictions failed:", error.message);
    }

    // Check contract initialization state
    console.log("\n🔍 Checking contract initialization...");
    try {
      const owner = await contract.owner();
      console.log("👤 Owner:", owner);

      const charityAddress = await contract.charityAddress();
      console.log("🏥 Charity address:", charityAddress);

      const maintenanceAddress = await contract.maintenanceAddress();
      console.log("🔧 Maintenance address:", maintenanceAddress);

      const charityFee = await contract.charityFeePercentage();
      console.log("💰 Charity fee:", charityFee.toString() + "%");

      const maintenanceFee = await contract.maintenanceFeePercentage();
      console.log("🔧 Maintenance fee:", maintenanceFee.toString() + "%");

      // Check for zero addresses (which would cause issues)
      if (charityAddress === "0x0000000000000000000000000000000000000000") {
        console.log(
          "❌ Charity address is zero - this will cause createPrediction to fail!"
        );
      }
      if (maintenanceAddress === "0x0000000000000000000000000000000000000000") {
        console.log(
          "❌ Maintenance address is zero - this will cause createPrediction to fail!"
        );
      }
    } catch (error) {
      console.log("⚠️ Failed to read contract state:", error.message);
    }

    // Try to read prediction ID 0 and 1
    for (let id = 0; id <= 2; id++) {
      try {
        const prediction = await contract.getPrediction(id);
        console.log(`📋 Prediction ${id}:`, {
          id: prediction.id.toString(),
          creator: prediction.creator,
          title: prediction.title,
          status: prediction.status.toString(),
        });
      } catch (error) {
        console.log(
          `❌ Prediction ${id} not found:`,
          error.message.split("(")[0]
        );
      }
    }

    // Check if we have a private key for testing transactions
    const privateKey = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
    if (!privateKey) {
      console.log("\n⚠️ No private key found in environment variables");
      console.log(
        "💡 Add PRIVATE_KEY or BOT_PRIVATE_KEY to .env.local to test transactions"
      );
      return;
    }

    console.log("\n🔐 Private key found, testing transaction...");

    // Create wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("👤 Wallet address:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Wallet balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("❌ Wallet has no ETH for gas fees");
      console.log(
        "💡 Get test ETH from: https://www.alchemy.com/faucets/base-sepolia"
      );
      return;
    }

    // Create contract instance with signer
    const contractWithSigner = new ethers.Contract(
      CONTRACT_ADDRESS,
      TEST_ABI,
      wallet
    );

    // Prepare test prediction data
    const testPrediction = {
      title: "Manual Test Prediction",
      description:
        "This is a test prediction created manually via terminal script",
      targetDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      targetValue: 1000,
      category: 3, // CUSTOM
      network: "base",
      emoji: "🧪",
      autoResolvable: false,
    };

    console.log("\n🚀 Creating test prediction...");
    console.log("📋 Prediction data:", testPrediction);

    // Test individual requirements first
    console.log("\n🔍 Testing requirements...");
    console.log("📝 Title length:", testPrediction.title.length);
    console.log("⏰ Current timestamp:", Math.floor(Date.now() / 1000));
    console.log("🎯 Target timestamp:", testPrediction.targetDate);
    console.log(
      "✅ Target date in future:",
      testPrediction.targetDate > Math.floor(Date.now() / 1000)
    );

    // Try a simpler call first - check if contract is properly initialized
    try {
      console.log("\n🔍 Testing contract state...");
      const owner = await provider.getStorageAt(CONTRACT_ADDRESS, 0);
      console.log("📋 Contract storage slot 0:", owner);
    } catch (error) {
      console.log("⚠️ Could not read contract storage:", error.message);
    }

    // Try with explicit gas settings first
    try {
      console.log("\n⛽ Trying transaction with explicit gas settings...");

      // Set a high gas limit to rule out gas issues
      const gasLimit = 500000; // 500k gas
      const feeData = await provider.getFeeData();

      console.log("⛽ Gas limit:", gasLimit);
      console.log("⛽ Max fee per gas:", feeData.maxFeePerGas?.toString());

      const tx = await contractWithSigner.createPrediction(
        testPrediction.title,
        testPrediction.description,
        testPrediction.targetDate,
        testPrediction.targetValue,
        testPrediction.category,
        testPrediction.network,
        testPrediction.emoji,
        testPrediction.autoResolvable,
        {
          gasLimit: gasLimit,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );

      console.log("📤 Transaction sent with explicit gas:", tx.hash);
      console.log(
        "🔗 View on BaseScan:",
        `https://sepolia.basescan.org/tx/${tx.hash}`
      );

      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("✅ Transaction confirmed!");
      console.log("📦 Block number:", receipt.blockNumber);
      console.log("⛽ Gas used:", receipt.gasUsed.toString());

      // Check if prediction was created
      console.log("\n🔍 Checking if prediction was created...");
      const newTotalPredictions = await contract.getTotalPredictions();
      console.log("📊 New total predictions:", newTotalPredictions.toString());

      // Try to read the new prediction
      const predictionId = newTotalPredictions; // Contract uses 1-indexed
      try {
        const newPrediction = await contract.getPrediction(predictionId);
        console.log("🎉 New prediction created successfully!");
        console.log("📋 Prediction details:", {
          id: newPrediction.id.toString(),
          title: newPrediction.title,
          creator: newPrediction.creator,
          targetDate: new Date(
            Number(newPrediction.targetDate) * 1000
          ).toISOString(),
        });
      } catch (error) {
        console.log("❌ Could not read new prediction:", error.message);
      }

      return; // Success!
    } catch (explicitGasError) {
      console.log(
        "❌ Transaction with explicit gas failed:",
        explicitGasError.message
      );
      console.log("🔍 Error details:", explicitGasError);
    }

    // If explicit gas failed, try gas estimation
    try {
      console.log("\n⛽ Falling back to gas estimation...");
      const gasEstimate = await contractWithSigner.createPrediction.estimateGas(
        testPrediction.title,
        testPrediction.description,
        testPrediction.targetDate,
        testPrediction.targetValue,
        testPrediction.category,
        testPrediction.network,
        testPrediction.emoji,
        testPrediction.autoResolvable
      );
      console.log("⛽ Gas estimate:", gasEstimate.toString());

      // If gas estimation succeeds, try the transaction
      const tx = await contractWithSigner.createPrediction(
        testPrediction.title,
        testPrediction.description,
        testPrediction.targetDate,
        testPrediction.targetValue,
        testPrediction.category,
        testPrediction.network,
        testPrediction.emoji,
        testPrediction.autoResolvable
      );

      console.log("📤 Transaction sent:", tx.hash);
      console.log(
        "🔗 View on BaseScan:",
        `https://sepolia.basescan.org/tx/${tx.hash}`
      );

      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("✅ Transaction confirmed!");
      console.log("📦 Block number:", receipt.blockNumber);
      console.log("⛽ Gas used:", receipt.gasUsed.toString());

      // Check if prediction was created
      console.log("\n🔍 Checking if prediction was created...");
      const newTotalPredictions = await contract.getTotalPredictions();
      console.log("📊 New total predictions:", newTotalPredictions.toString());

      // Try to read the new prediction
      const predictionId = newTotalPredictions; // Contract uses 1-indexed
      try {
        const newPrediction = await contract.getPrediction(predictionId);
        console.log("🎉 New prediction created successfully!");
        console.log("📋 Prediction details:", {
          id: newPrediction.id.toString(),
          title: newPrediction.title,
          creator: newPrediction.creator,
          targetDate: new Date(
            Number(newPrediction.targetDate) * 1000
          ).toISOString(),
        });
      } catch (error) {
        console.log("❌ Could not read new prediction:", error.message);
      }
    } catch (error) {
      console.log("❌ Gas estimation failed:", error.message);
      console.log("🔍 Error details:", error);

      // Try to call the function statically to get a better error message
      try {
        console.log("\n🔍 Trying static call for better error...");
        await contractWithSigner.createPrediction.staticCall(
          testPrediction.title,
          testPrediction.description,
          testPrediction.targetDate,
          testPrediction.targetValue,
          testPrediction.category,
          testPrediction.network,
          testPrediction.emoji,
          testPrediction.autoResolvable
        );
      } catch (staticError) {
        console.log("❌ Static call failed:", staticError.message);
        console.log("🔍 Static error details:", staticError);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testContract()
  .then(() => {
    console.log("\n✅ Test completed");
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
