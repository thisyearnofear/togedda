const { ethers } = require("hardhat");

async function main() {
  console.log("🏋️ Deploying SweatEquityBot contract...");

  // Get the contract factory
  const SweatEquityBot = await ethers.getContractFactory("SweatEquityBot");

  // Base Sepolia prediction market contract address
  const PREDICTION_MARKET_ADDRESS = "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB";

  console.log("📋 Using Prediction Market:", PREDICTION_MARKET_ADDRESS);

  // Deploy the contract
  const sweatEquityBot = await SweatEquityBot.deploy(PREDICTION_MARKET_ADDRESS);

  await sweatEquityBot.deployed();

  console.log("✅ SweatEquityBot deployed to:", sweatEquityBot.address);
  console.log("🔗 Linked to Prediction Market:", PREDICTION_MARKET_ADDRESS);

  // Verify deployment
  console.log("\n📊 Contract Details:");
  console.log("- Contract Address:", sweatEquityBot.address);
  console.log("- Prediction Market:", await sweatEquityBot.predictionMarket());
  console.log("- Sweat Equity Window:", await sweatEquityBot.SWEAT_EQUITY_WINDOW(), "seconds (24 hours)");
  console.log("- Recoverable Percentage:", await sweatEquityBot.RECOVERABLE_PERCENT(), "%");
  console.log("- Charity Fee:", await sweatEquityBot.CHARITY_FEE_PERCENT(), "%");
  console.log("- Maintenance Fee:", await sweatEquityBot.MAINTENANCE_FEE_PERCENT(), "%");

  console.log("\n🎯 SweatEquityBot Features:");
  console.log("✅ 24-hour sweat equity window for losing predictions");
  console.log("✅ 80% stake recovery through exercise completion");
  console.log("✅ Multiple verification methods (photo, video, wearable, community)");
  console.log("✅ Gamification with NFTs and scoring system");
  console.log("✅ Streak tracking and leaderboards");
  console.log("✅ Support for multiple exercise types");

  console.log("\n🚀 Next Steps:");
  console.log("1. Update frontend to integrate SweatEquityBot");
  console.log("2. Implement verification systems");
  console.log("3. Add gamification UI components");
  console.log("4. Test sweat equity flow end-to-end");

  // Save deployment info
  const deploymentInfo = {
    contractAddress: sweatEquityBot.address,
    predictionMarketAddress: PREDICTION_MARKET_ADDRESS,
    network: "base-sepolia",
    deployedAt: new Date().toISOString(),
    features: {
      sweatEquityWindow: "24 hours",
      recoverablePercentage: "80%",
      charityFee: "15%",
      maintenanceFee: "5%",
      nftSupport: true,
      gamification: true
    }
  };

  console.log("\n📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
