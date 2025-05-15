// Deploy script for ImperfectFormPredictionMarketV2 contracts
// Run with: npx hardhat run scripts/deploy_v2_contracts.js --network celo

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Greenpill Kenya charity address
  const charityAddress = "0x0e5DaC01687592597d3e4307cdB7B3B616F2822E";
  
  // Maintenance address (set to deployer for now)
  const maintenanceAddress = deployer.address;

  // Deploy the prediction market contract directly
  const PredictionMarket = await ethers.getContractFactory("ImperfectFormPredictionMarketV2");
  const predictionMarket = await PredictionMarket.deploy(charityAddress, maintenanceAddress);
  await predictionMarket.deployed();
  console.log("ImperfectFormPredictionMarketV2 deployed to:", predictionMarket.address);

  // Deploy the factory contract
  const PredictionMarketFactory = await ethers.getContractFactory("ImperfectFormPredictionMarketFactoryV2");
  const predictionMarketFactory = await PredictionMarketFactory.deploy(charityAddress, maintenanceAddress);
  await predictionMarketFactory.deployed();
  console.log("ImperfectFormPredictionMarketFactoryV2 deployed to:", predictionMarketFactory.address);

  // Create the four initial predictions
  console.log("Creating initial predictions...");

  // 1. Celo Mainnet prediction
  const celoTitle = "The celo community will not reach 10,000 total squats by 15th June 2025";
  const celoDescription = "This prediction is about whether the Celo community will collectively perform 10,000 squats by the target date. All proceeds go to Greenpill Kenya.";
  // June 15, 2025 in Unix timestamp
  const targetDate = 1750204800; 
  const targetValue = 10000;
  const celoCategory = 0; // FITNESS
  const celoNetwork = "Celo Mainnet";
  const celoEmoji = "🏋️‍♂️";

  await predictionMarket.createPrediction(
    celoTitle,
    celoDescription,
    targetDate,
    targetValue,
    celoCategory,
    celoNetwork,
    celoEmoji
  );
  console.log("Created Celo prediction");

  // 2. Polygon Mainnet prediction
  const polygonTitle = "No polygon user will complete 500 pushups in a single week by 15th June 2025";
  const polygonDescription = "This prediction is about whether any Polygon user will complete 500 pushups in a single week by the target date. All proceeds go to Greenpill Kenya.";
  const polygonCategory = 0; // FITNESS
  const polygonNetwork = "Polygon Mainnet";
  const polygonEmoji = "💪";

  await predictionMarket.createPrediction(
    polygonTitle,
    polygonDescription,
    targetDate,
    500,
    polygonCategory,
    polygonNetwork,
    polygonEmoji
  );
  console.log("Created Polygon prediction");

  // 3. Base Sepolia prediction
  const baseTitle = "No base user will complete 500 squats in a single week by 15th June 2025";
  const baseDescription = "This prediction is about whether any Base user will complete 500 squats in a single week by the target date. All proceeds go to Greenpill Kenya.";
  const baseCategory = 0; // FITNESS
  const baseNetwork = "Base Sepolia";
  const baseEmoji = "🏃‍♂️";

  await predictionMarket.createPrediction(
    baseTitle,
    baseDescription,
    targetDate,
    500,
    baseCategory,
    baseNetwork,
    baseEmoji
  );
  console.log("Created Base prediction");

  // 4. Monad Testnet prediction
  const monadTitle = "The monad community will not reach 10,000 total pushups by 15th June 2025";
  const monadDescription = "This prediction is about whether the Monad community will collectively perform 10,000 pushups by the target date. All proceeds go to Greenpill Kenya.";
  const monadCategory = 0; // FITNESS
  const monadNetwork = "Monad Testnet";
  const monadEmoji = "🏆";

  await predictionMarket.createPrediction(
    monadTitle,
    monadDescription,
    targetDate,
    10000,
    monadCategory,
    monadNetwork,
    monadEmoji
  );
  console.log("Created Monad prediction");

  console.log("All predictions created successfully!");
  console.log("Charity address set to:", charityAddress);
  console.log("Maintenance address set to:", maintenanceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
