const { ethers } = require("hardhat");

async function main() {
  // Get the contract factory for PredictionBot
  const PredictionBot = await ethers.getContractFactory("PredictionBot");

  // Address of the existing ImperfectFormPredictionMarketV2 contract on Base Sepolia
  const predictionMarketAddress = "0x9B4Be1030eDC90205C10aEE54920192A13c12Cba";

  // Initial fee for proposing predictions (in wei)
  const initialFee = ethers.utils.parseEther("0.001"); // Example: 0.001 ETH

  console.log("Deploying PredictionBot...");
  const predictionBot = await PredictionBot.deploy(
    predictionMarketAddress,
    initialFee
  );

  await predictionBot.deployed();
  console.log("PredictionBot deployed to:", predictionBot.address);

  // Optionally, verify the contract on Etherscan (if using Hardhat's verification plugin)
  // Uncomment the following lines if verification is set up
  /*
  console.log("Verifying contract on Etherscan...");
  await hre.run("verify:verify", {
    address: predictionBot.address,
    constructorArguments: [predictionMarketAddress, initialFee],
  });
  console.log("Contract verified on Etherscan.");
  */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
