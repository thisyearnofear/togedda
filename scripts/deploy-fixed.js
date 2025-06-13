const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Fixed Prediction Market Contract to Base Sepolia");

  // Contract constructor parameters
  const CHARITY_ADDRESS = "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1"; // Greenpill Kenya
  const MAINTENANCE_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058"; // Your address
  const CHARITY_FEE = 15; // 15%
  const MAINTENANCE_FEE = 5; // 5%

  console.log("📋 Deployment Parameters:");
  console.log("🏥 Charity Address:", CHARITY_ADDRESS);
  console.log("🔧 Maintenance Address:", MAINTENANCE_ADDRESS);
  console.log("💰 Charity Fee:", CHARITY_FEE + "%");
  console.log("🔧 Maintenance Fee:", MAINTENANCE_FEE + "%");
  console.log("📊 Total Fee:", (CHARITY_FEE + MAINTENANCE_FEE) + "%");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Deployer account has no ETH for gas fees");
  }

  // Deploy the contract
  console.log("\n⚙️ Compiling and deploying contract...");
  
  const PredictionMarket = await ethers.getContractFactory("ImperfectFormPredictionMarketV2Fixed");
  
  const contract = await PredictionMarket.deploy(
    CHARITY_ADDRESS,
    MAINTENANCE_ADDRESS,
    CHARITY_FEE,
    MAINTENANCE_FEE
  );

  console.log("📤 Deployment transaction sent:", contract.deploymentTransaction().hash);
  console.log("⏳ Waiting for confirmation...");

  // Wait for deployment
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n🎉 Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 View on BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);

  // Verify deployment by calling read functions
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await contract.owner();
    const totalPredictions = await contract.getTotalPredictions();
    const charityAddr = await contract.charityAddress();
    const maintenanceAddr = await contract.maintenanceAddress();
    const charityFee = await contract.charityFeePercentage();
    const maintenanceFee = await contract.maintenanceFeePercentage();
    
    console.log("✅ Owner:", owner);
    console.log("✅ Total Predictions:", totalPredictions.toString());
    console.log("✅ Charity Address:", charityAddr);
    console.log("✅ Maintenance Address:", maintenanceAddr);
    console.log("✅ Charity Fee:", charityFee.toString() + "%");
    console.log("✅ Maintenance Fee:", maintenanceFee.toString() + "%");
    
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("✅ Ownership verified");
    } else {
      console.log("❌ Ownership mismatch");
    }
    
  } catch (error) {
    console.log("⚠️ Verification failed:", error.message);
  }

  // Test creating a prediction
  console.log("\n🧪 Testing createPrediction function...");
  try {
    const testTx = await contract.createPrediction(
      "Test Prediction",
      "This is a test prediction to verify the contract works",
      Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      1000,
      3, // CUSTOM category
      "base",
      "🧪",
      false
    );

    console.log("📤 Test transaction sent:", testTx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await testTx.wait();
    console.log("✅ Test prediction created successfully!");
    console.log("📦 Block number:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Check if prediction was created
    const newTotalPredictions = await contract.getTotalPredictions();
    console.log("📊 Total predictions after test:", newTotalPredictions.toString());

    if (newTotalPredictions > 0) {
      const testPrediction = await contract.getPrediction(1);
      console.log("📋 Test prediction details:");
      console.log("  ID:", testPrediction.id.toString());
      console.log("  Title:", testPrediction.title);
      console.log("  Creator:", testPrediction.creator);
      console.log("  Status:", testPrediction.status.toString());
    }

  } catch (error) {
    console.log("❌ Test prediction failed:", error.message);
    console.log("🔍 This might indicate an issue with the contract logic");
  }

  // Update constants file
  console.log("\n📝 Updating constants file...");
  try {
    await updateConstants(contractAddress);
    console.log("✅ Constants file updated");
  } catch (error) {
    console.log("⚠️ Failed to update constants:", error.message);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log("  Contract Address:", contractAddress);
  console.log("  Network: Base Sepolia (Chain ID: 84532)");
  console.log("  Deployer:", deployer.address);
  console.log("  Transaction:", contract.deploymentTransaction().hash);

  return contractAddress;
}

async function updateConstants(contractAddress) {
  const constantsPath = 'lib/constants.ts';
  let constants = fs.readFileSync(constantsPath, 'utf8');
  
  // Update the prediction market address
  constants = constants.replace(
    /PREDICTION_MARKET_ADDRESS = "0x[a-fA-F0-9]{40}"/,
    `PREDICTION_MARKET_ADDRESS = "${contractAddress}"`
  );
  
  // Update the dual-chain-service Base Sepolia contract address
  constants = constants.replace(
    /contractAddress: "0x9B4Be1030eDC90205C10aEE54920192A13c12Cba"/,
    `contractAddress: "${contractAddress}"`
  );
  
  fs.writeFileSync(constantsPath, constants);
}

// Run the deployment
main()
  .then((address) => {
    console.log("\n✅ Deployment script completed successfully");
    console.log("📍 New contract address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
