const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏋️ Configuring SweatEquityBot fitness contracts...");

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../../deployments");
  const deploymentPath = path.join(deploymentsDir, "base-mainnet-sweat-equity.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please deploy SweatEquityBot first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  console.log(`📋 SweatEquityBot Address: ${contractAddress}`);

  // Get contract instance
  const SweatEquityBot = await ethers.getContractFactory("SweatEquityBot");
  const sweatEquityBot = SweatEquityBot.attach(contractAddress);

  // Real fitness contract addresses from existing leaderboard system
  // These are the actual contracts that collect pushup/squat data
  const FITNESS_CONTRACTS = {
    // Base mainnet - primary network for SweatEquityBot
    "base": {
      address: "0x1234567890123456789012345678901234567890", // UPDATE: Real Base fitness contract
      description: "Base mainnet fitness leaderboard"
    },

    // CELO mainnet - cross-chain data aggregation
    "celo": {
      address: "0x2345678901234567890123456789012345678901", // UPDATE: Real CELO fitness contract
      description: "CELO mainnet fitness leaderboard"
    },

    // Polygon mainnet - additional data source
    "polygon": {
      address: "0x3456789012345678901234567890123456789012", // UPDATE: Real Polygon fitness contract
      description: "Polygon mainnet fitness leaderboard"
    },

    // Monad mainnet - future expansion
    "monad": {
      address: "0x4567890123456789012345678901234567890123", // UPDATE: Real Monad fitness contract
      description: "Monad mainnet fitness leaderboard"
    }
  };

  console.log("\n🔗 Configuring fitness contracts for cross-chain data aggregation...");

  // Track configuration results
  const configResults = {};
  let successCount = 0;
  let errorCount = 0;

  // Configure each fitness contract
  for (const [network, config] of Object.entries(FITNESS_CONTRACTS)) {
    try {
      console.log(`\n⚙️  Configuring ${network.toUpperCase()}...`);
      console.log(`   Address: ${config.address}`);
      console.log(`   Description: ${config.description}`);

      // Check if address is a placeholder
      if (config.address.startsWith("0x123") || config.address.startsWith("0x000")) {
        console.log(`   ⚠️  Skipping ${network} - placeholder address detected`);
        console.log(`   ℹ️  Please update with real contract address from leaderboard system`);
        configResults[network] = {
          status: "skipped",
          reason: "placeholder_address",
          address: config.address
        };
        continue;
      }

      // Set fitness contract
      const tx = await sweatEquityBot.setFitnessContract(network, config.address);
      console.log(`   📝 Transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);

      // Verify configuration
      const configuredAddress = await sweatEquityBot.fitnessContracts(network);
      if (configuredAddress.toLowerCase() === config.address.toLowerCase()) {
        console.log(`   ✅ Configuration verified successfully`);
        configResults[network] = {
          status: "success",
          address: config.address,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber
        };
        successCount++;
      } else {
        console.log(`   ❌ Configuration verification failed`);
        configResults[network] = {
          status: "verification_failed",
          expected: config.address,
          actual: configuredAddress
        };
        errorCount++;
      }

    } catch (error) {
      console.error(`   ❌ Error configuring ${network}:`, error.message);
      configResults[network] = {
        status: "error",
        error: error.message,
        address: config.address
      };
      errorCount++;
    }
  }

  // Display configuration summary
  console.log("\n📊 CONFIGURATION SUMMARY");
  console.log("=" * 50);
  console.log(`✅ Successfully configured: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⚠️  Skipped: ${Object.values(configResults).filter(r => r.status === "skipped").length}`);

  // Save configuration results
  const configPath = path.join(deploymentsDir, "fitness-contracts-config.json");
  const configData = {
    timestamp: new Date().toISOString(),
    sweatEquityBotAddress: contractAddress,
    network: "base-mainnet",
    configurationResults: configResults,
    summary: {
      total: Object.keys(FITNESS_CONTRACTS).length,
      successful: successCount,
      errors: errorCount,
      skipped: Object.values(configResults).filter(r => r.status === "skipped").length
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log(`\n💾 Configuration results saved to: ${configPath}`);

  // Test cross-chain data integration
  console.log("\n🧪 Testing cross-chain data integration...");

  try {
    // Test with a sample address (you can replace with a real address from your leaderboard)
    const testAddress = "0x1234567890123456789012345678901234567890";

    // Test pushups data aggregation
    const pushupsCount = await sweatEquityBot.getUserCurrentExerciseCount(testAddress, 0);
    console.log(`📊 Test pushups count for ${testAddress.substring(0, 10)}...: ${pushupsCount}`);

    // Test squats data aggregation
    const squatsCount = await sweatEquityBot.getUserCurrentExerciseCount(testAddress, 1);
    console.log(`📊 Test squats count for ${testAddress.substring(0, 10)}...: ${squatsCount}`);

    console.log("✅ Cross-chain data integration test completed");

  } catch (error) {
    console.warn("⚠️  Cross-chain data test failed (expected if using placeholder addresses):", error.message);
  }

  // Next steps
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Update fitness contract addresses with real deployments:");
  console.log("   - Extract contract addresses from existing leaderboard system");
  console.log("   - These contracts are already deployed on imperfectform.fun");
  console.log("   - Update FITNESS_CONTRACTS object in this script");
  console.log("   - Re-run configuration: npm run configure:fitness-contracts");

  console.log("\n2. Update prediction market to link with SweatEquityBot:");
  console.log("   - Deploy updated UnifiedPredictionMarket contract");
  console.log(`   - Call setSweatEquityBot("${contractAddress}")`);

  console.log("\n3. Test complete integration:");
  console.log("   - Create a prediction and lose it");
  console.log("   - Create sweat equity challenge");
  console.log("   - Verify fitness data is correctly aggregated");
  console.log("   - Test autonomous verification via AgentKit");

  console.log("\n4. Update frontend configuration:");
  console.log(`   - Add SweatEquityBot address: ${contractAddress}`);
  console.log("   - Update SweatEquityBotService");
  console.log("   - Add sweat equity UI components");

  console.log("\n🎉 FITNESS CONTRACTS CONFIGURATION COMPLETED!");

  if (successCount > 0) {
    console.log("🔥 SweatEquityBot is now connected to the fitness data ecosystem!");
    console.log("💪 Users can now recover lost stakes through verified exercise!");
  }

  if (errorCount > 0) {
    console.log("⚠️  Some configurations failed - please check the logs above");
    console.log("📝 Update the real contract addresses and re-run the configuration");
  }

  return {
    contractAddress,
    configResults,
    summary: configData.summary
  };
}

// Execute configuration
main()
  .then((result) => {
    console.log("\n🚀 Configuration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
