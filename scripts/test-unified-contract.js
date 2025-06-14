const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Unified Prediction Market Contract");
  console.log("============================================");

  // Get network info to determine correct contract address
  const network = await ethers.provider.getNetwork();

  // Contract addresses by network
  const contractAddresses = {
    84532: "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB", // Base Sepolia
    42220: "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F", // CELO Mainnet
  };

  const contractAddress = contractAddresses[network.chainId.toString()];

  if (!contractAddress) {
    throw new Error(
      `No contract address configured for chain ID ${network.chainId}`
    );
  }

  // Get the contract factory and attach to deployed contract
  const UnifiedPredictionMarket = await ethers.getContractFactory(
    "UnifiedPredictionMarket"
  );
  const contract = UnifiedPredictionMarket.attach(contractAddress);

  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Network:", (await ethers.provider.getNetwork()).name);

  try {
    // Test basic contract functions
    console.log("\n🔍 Testing contract functions...");

    // Test 1: Get total predictions
    const totalPredictions = await contract.getTotalPredictions();
    console.log("📊 Total predictions:", totalPredictions.toString());

    // Test 2: Get fee structure
    const charityFee = await contract.charityFeePercentage();
    const maintenanceFee = await contract.maintenanceFeePercentage();
    const totalFee = await contract.getTotalFeePercentage();

    console.log("💰 Fee structure:");
    console.log("  - Charity:", charityFee.toString() + "%");
    console.log("  - Maintenance:", maintenanceFee.toString() + "%");
    console.log("  - Total:", totalFee.toString() + "%");

    // Test 3: Get addresses
    const charityAddress = await contract.charityAddress();
    const maintenanceAddress = await contract.maintenanceAddress();
    const owner = await contract.owner();

    console.log("🏥 Charity address:", charityAddress);
    console.log("🔧 Maintenance address:", maintenanceAddress);
    console.log("👑 Contract owner:", owner);

    // Test 4: Get next prediction ID
    const nextId = await contract.nextPredictionId();
    console.log("🆔 Next prediction ID:", nextId.toString());

    console.log("\n✅ All contract functions working correctly!");

    // Test 5: Try to get a prediction (should fail gracefully for non-existent prediction)
    try {
      console.log("\n🔍 Testing prediction retrieval...");
      const prediction = await contract.getPrediction(1);
      console.log("📋 Found prediction 1:", prediction.title);
    } catch (error) {
      console.log(
        "📋 No prediction with ID 1 found (expected for new contract)"
      );
    }

    console.log("\n🎉 Contract test completed successfully!");
    console.log("📋 The unified contract is ready for use!");
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Test script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error);
    process.exit(1);
  });
