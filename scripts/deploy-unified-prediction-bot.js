/**
 * Deploy PredictionBot contracts for both CELO and Base networks
 * Updated for Base Batches Messaging Buildathon
 * 
 * This script deploys PredictionBot contracts that reference the unified
 * prediction market contracts for enhanced XMTP integration.
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Unified PredictionBot contracts for Base Batches Buildathon...\n");

  // Get the contract factory
  const PredictionBot = await ethers.getContractFactory("PredictionBot");
  
  // Network configuration
  const network = hre.network.name;
  console.log(`📡 Current network: ${network}`);

  let deployments = [];

  if (network === "baseSepolia") {
    console.log("🔵 Deploying to Base Sepolia...");
    
    const deployment = await deployToNetwork({
      PredictionBot,
      networkName: "Base Sepolia",
      predictionMarketAddress: "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB", // Unified contract
      proposalFee: ethers.parseEther("0.001"), // 0.001 ETH
      currency: "ETH",
      isProduction: false
    });
    
    deployments.push(deployment);
    
  } else if (network === "celoMainnet") {
    console.log("🟡 Deploying to CELO Mainnet...");
    
    const deployment = await deployToNetwork({
      PredictionBot,
      networkName: "CELO Mainnet",
      predictionMarketAddress: "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F", // Unified contract
      proposalFee: ethers.parseEther("0.01"), // 0.01 CELO
      currency: "CELO",
      isProduction: true
    });
    
    deployments.push(deployment);
    
  } else if (network === "localhost" || network === "hardhat") {
    console.log("🏠 Deploying to local network for testing...");
    
    // For local testing, deploy a mock prediction market first
    console.log("📝 Deploying mock UnifiedPredictionMarket for testing...");
    const UnifiedPredictionMarket = await ethers.getContractFactory("UnifiedPredictionMarket");
    const mockMarket = await UnifiedPredictionMarket.deploy(
      "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1", // charity address
      "0x55A5705453Ee82c742274154136Fce8149597058"  // maintenance address
    );
    await mockMarket.waitForDeployment();
    const mockMarketAddress = await mockMarket.getAddress();
    console.log(`✅ Mock UnifiedPredictionMarket deployed: ${mockMarketAddress}`);
    
    const deployment = await deployToNetwork({
      PredictionBot,
      networkName: "Local Network",
      predictionMarketAddress: mockMarketAddress,
      proposalFee: ethers.parseEther("0.001"),
      currency: "ETH",
      isProduction: false
    });
    
    deployments.push(deployment);
    
  } else {
    throw new Error(`❌ Unsupported network: ${network}. Use 'baseSepolia', 'celoMainnet', or 'localhost'`);
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));
  
  deployments.forEach((deployment, index) => {
    console.log(`\n${index + 1}. ${deployment.networkName}`);
    console.log(`   PredictionBot: ${deployment.botAddress}`);
    console.log(`   UnifiedPredictionMarket: ${deployment.marketAddress}`);
    console.log(`   Proposal Fee: ${deployment.fee} ${deployment.currency}`);
    console.log(`   Explorer: ${deployment.explorerUrl}`);
  });

  // Environment variables
  console.log("\n" + "=".repeat(80));
  console.log("🔧 ENVIRONMENT VARIABLES");
  console.log("=".repeat(80));
  
  deployments.forEach(deployment => {
    if (deployment.networkName.includes("Base")) {
      console.log(`BASE_PREDICTION_BOT_ADDRESS=${deployment.botAddress}`);
    } else if (deployment.networkName.includes("CELO")) {
      console.log(`CELO_PREDICTION_BOT_ADDRESS=${deployment.botAddress}`);
    }
  });

  // Next steps
  console.log("\n" + "=".repeat(80));
  console.log("📋 NEXT STEPS");
  console.log("=".repeat(80));
  console.log("1. Update .env.local with the new contract addresses");
  console.log("2. Authorize your XMTP bot address in the PredictionBot contract");
  console.log("3. Test the integration with: npm run bot:test");
  console.log("4. Deploy to production: npm run build && npm run start");
  
  console.log("\n🚀 Ready for Base Batches Messaging Buildathon! 🎯");
}

async function deployToNetwork({
  PredictionBot,
  networkName,
  predictionMarketAddress,
  proposalFee,
  currency,
  isProduction
}) {
  console.log(`\n📋 Deployment Configuration:`);
  console.log(`   Network: ${networkName}`);
  console.log(`   UnifiedPredictionMarket: ${predictionMarketAddress}`);
  console.log(`   Proposal Fee: ${ethers.formatEther(proposalFee)} ${currency}`);
  console.log(`   Production: ${isProduction ? 'Yes' : 'No (Testnet)'}`);

  // Deploy PredictionBot
  console.log(`\n🔄 Deploying PredictionBot...`);
  const predictionBot = await PredictionBot.deploy(
    predictionMarketAddress,
    proposalFee
  );

  await predictionBot.waitForDeployment();
  const botAddress = await predictionBot.getAddress();
  
  console.log(`✅ PredictionBot deployed: ${botAddress}`);

  // Get deployer address for authorization
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer address: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ${currency}`);

  // Authorize the deployer as a bot (they can authorize the actual XMTP bot later)
  console.log(`\n🔐 Setting up initial authorization...`);
  try {
    const authTx = await predictionBot.authorizeBots([deployer.address], true);
    await authTx.wait();
    console.log(`✅ Deployer authorized as bot`);
  } catch (error) {
    console.log(`⚠️ Authorization setup failed: ${error.message}`);
  }

  // Generate explorer URL
  let explorerUrl = '';
  if (networkName.includes('Base')) {
    explorerUrl = `https://sepolia.basescan.org/address/${botAddress}`;
  } else if (networkName.includes('CELO')) {
    explorerUrl = `https://celoscan.io/address/${botAddress}`;
  } else {
    explorerUrl = 'Local network (no explorer)';
  }

  // Verify contract if on testnet/mainnet
  if (process.env.VERIFY_CONTRACTS === "true" && !networkName.includes('Local')) {
    console.log(`\n🔍 Verifying contract on block explorer...`);
    try {
      await hre.run("verify:verify", {
        address: botAddress,
        constructorArguments: [predictionMarketAddress, proposalFee],
      });
      console.log(`✅ Contract verified successfully!`);
    } catch (error) {
      console.log(`⚠️ Verification failed: ${error.message}`);
    }
  }

  return {
    networkName,
    botAddress,
    marketAddress: predictionMarketAddress,
    fee: ethers.formatEther(proposalFee),
    currency,
    explorerUrl,
    isProduction
  };
}

// Handle errors gracefully
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
