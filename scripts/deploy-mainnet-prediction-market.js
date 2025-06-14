const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying UnifiedPredictionMarket to Base Mainnet...");

  // Get the contract factory
  const UnifiedPredictionMarket = await ethers.getContractFactory("UnifiedPredictionMarket");

  // Configuration for Base mainnet
  const CHARITY_ADDRESS = "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1"; // Greenpill Kenya
  const MAINTENANCE_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058"; // Maintenance wallet

  console.log("📋 Deployment Parameters:");
  console.log(`- Network: Base Mainnet (Chain ID: 8453)`);
  console.log(`- Charity Address: ${CHARITY_ADDRESS}`);
  console.log(`- Maintenance Address: ${MAINTENANCE_ADDRESS}`);

  // Deploy the contract
  console.log("\n🔨 Deploying UnifiedPredictionMarket...");
  const predictionMarket = await UnifiedPredictionMarket.deploy(
    CHARITY_ADDRESS,
    MAINTENANCE_ADDRESS
  );

  // Wait for deployment
  await predictionMarket.waitForDeployment();
  const contractAddress = await predictionMarket.getAddress();

  console.log(`✅ UnifiedPredictionMarket deployed to: ${contractAddress}`);

  // Get deployment transaction
  const deployTx = predictionMarket.deploymentTransaction();
  console.log(`📝 Deployment tx: ${deployTx.hash}`);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");

  const owner = await predictionMarket.owner();
  const charityAddress = await predictionMarket.charityAddress();
  const maintenanceAddress = await predictionMarket.maintenanceAddress();
  const charityFeePercentage = await predictionMarket.charityFeePercentage();
  const maintenanceFeePercentage = await predictionMarket.maintenanceFeePercentage();
  const totalFeePercentage = await predictionMarket.totalFeePercentage();

  console.log(`✅ Owner: ${owner}`);
  console.log(`✅ Charity Address: ${charityAddress}`);
  console.log(`✅ Maintenance Address: ${maintenanceAddress}`);
  console.log(`✅ Charity Fee: ${charityFeePercentage}%`);
  console.log(`✅ Maintenance Fee: ${maintenanceFeePercentage}%`);
  console.log(`✅ Total Fee: ${totalFeePercentage}%`);

  // Save deployment info
  const deploymentInfo = {
    network: "base-mainnet",
    chainId: "8453",
    contractAddress: contractAddress,
    deployerAddress: owner,
    transactionHash: deployTx.hash,
    timestamp: new Date().toISOString(),
    parameters: {
      charityAddress: CHARITY_ADDRESS,
      maintenanceAddress: MAINTENANCE_ADDRESS
    },
    verification: {
      owner: owner,
      charityAddress: charityAddress,
      maintenanceAddress: maintenanceAddress,
      charityFeePercentage: charityFeePercentage.toString(),
      maintenanceFeePercentage: maintenanceFeePercentage.toString(),
      totalFeePercentage: totalFeePercentage.toString()
    }
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentPath = path.join(deploymentsDir, "base-mainnet.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  // Display summary
  console.log("\n🎉 DEPLOYMENT SUCCESSFUL! 🎉");
  console.log("=" * 50);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Network: Base Mainnet`);
  console.log(`Transaction: ${deployTx.hash}`);
  console.log(`Deployer: ${owner}`);
  console.log("=" * 50);

  // Next steps
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Verify contract on BaseScan:");
  console.log(`   npx hardhat verify --network base ${contractAddress} ${CHARITY_ADDRESS} ${MAINTENANCE_ADDRESS}`);
  console.log("\n2. Deploy SweatEquityBot with this prediction market:");
  console.log(`   Update deploy-base-mainnet.js to use: ${contractAddress}`);
  console.log("\n3. Update frontend configuration:");
  console.log(`   - Update dual-chain-service.ts with new address`);
  console.log(`   - Test prediction creation and voting`);
  console.log("\n4. Link SweatEquityBot:");
  console.log("   - Deploy SweatEquityBot with this prediction market address");
  console.log("   - Call setSweatEquityBot() on this contract");

  // Estimated costs
  console.log("\n💰 ESTIMATED COSTS:");
  console.log("- Deployment: ~$10-20 USD (depending on gas)");
  console.log("- Verification: Free");
  console.log("- SweatEquityBot linking: ~$2-5 USD");
  console.log("- Total: ~$12-25 USD");

  console.log("\n🎯 This creates a clean Base mainnet prediction market for SweatEquityBot!");

  return {
    contractAddress,
    deploymentInfo,
    deployTx
  };
}

// Execute deployment
main()
  .then((result) => {
    console.log("\n🚀 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
