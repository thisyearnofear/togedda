const { ethers } = require("hardhat");

async function main() {
  // Get the contract factory for PredictionBot
  const PredictionBot = await ethers.getContractFactory("PredictionBot");

  // Determine which network we're deploying to
  const network = hre.network.name;
  console.log(`Deploying PredictionBot to ${network}...`);

  let predictionMarketAddress;
  let networkName;

  if (network === "baseSepolia") {
    // NEW UNIFIED CONTRACT on Base Sepolia
    predictionMarketAddress = "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB";
    networkName = "Base Sepolia";
  } else if (network === "celoMainnet") {
    // NEW UNIFIED CONTRACT on CELO Mainnet
    predictionMarketAddress = "0xa226c82f1b6983aBb7287Cd4d83C2aEC802A183F";
    networkName = "CELO Mainnet";
  } else {
    throw new Error(
      `Unsupported network: ${network}. Use 'baseSepolia' or 'celoMainnet'`
    );
  }

  // Initial fee for proposing predictions (in wei)
  const initialFee =
    network === "celoMainnet"
      ? ethers.parseEther("0.01") // 0.01 CELO for production
      : ethers.parseEther("0.001"); // 0.001 ETH for testnet

  console.log(`Target UnifiedPredictionMarket: ${predictionMarketAddress}`);
  console.log(
    `Initial proposal fee: ${ethers.formatEther(initialFee)} ${
      network === "celoMainnet" ? "CELO" : "ETH"
    }`
  );

  const predictionBot = await PredictionBot.deploy(
    predictionMarketAddress,
    initialFee
  );

  await predictionBot.waitForDeployment();
  const deployedAddress = await predictionBot.getAddress();
  console.log(
    `✅ PredictionBot deployed to ${networkName}: ${deployedAddress}`
  );

  // Log deployment details
  console.log("\n📋 Deployment Summary:");
  console.log(`Network: ${networkName}`);
  console.log(`PredictionBot: ${deployedAddress}`);
  console.log(`UnifiedPredictionMarket: ${predictionMarketAddress}`);
  console.log(
    `Proposal Fee: ${ethers.formatEther(initialFee)} ${
      network === "celoMainnet" ? "CELO" : "ETH"
    }`
  );

  // Save deployment info to environment variables format
  console.log("\n🔧 Environment Variables:");
  if (network === "baseSepolia") {
    console.log(`BASE_PREDICTION_BOT_ADDRESS=${deployedAddress}`);
  } else {
    console.log(`CELO_PREDICTION_BOT_ADDRESS=${deployedAddress}`);
  }

  // Optionally, verify the contract on block explorer
  if (process.env.VERIFY_CONTRACTS === "true") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [predictionMarketAddress, initialFee],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
