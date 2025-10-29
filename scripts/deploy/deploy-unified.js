const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌐 Deploying Unified Prediction Market Contracts");
  console.log("===============================================");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Contract parameters
  const charityAddress = "0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1"; // Greenpill Kenya
  const maintenanceAddress = "0x55A5705453Ee82c742274154136Fce8149597058"; // Your address

  console.log("\n📋 Contract Parameters:");
  console.log("🏥 Charity Address:", charityAddress);
  console.log("🔧 Maintenance Address:", maintenanceAddress);

  // Get the contract factory
  console.log("\n⚙️ Getting contract factory...");
  const UnifiedPredictionMarket = await ethers.getContractFactory("UnifiedPredictionMarket");

  // Deploy the contract
  console.log("🚀 Deploying contract...");
  const contract = await UnifiedPredictionMarket.deploy(
    charityAddress,
    maintenanceAddress
  );

  console.log("📤 Transaction sent:", contract.deploymentTransaction().hash);
  console.log("⏳ Waiting for deployment...");

  // Wait for deployment
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? `Chain ${network.chainId}` : network.name;
  
  console.log("🌐 Network:", networkName);
  console.log("🔗 Chain ID:", network.chainId.toString());

  // Verify deployment by calling view functions
  try {
    console.log("\n🔍 Verifying deployment...");
    
    const totalPredictions = await contract.getTotalPredictions();
    console.log("📊 Total predictions:", totalPredictions.toString());
    
    const charityFee = await contract.charityFeePercentage();
    const maintenanceFee = await contract.maintenanceFeePercentage();
    const totalFee = await contract.getTotalFeePercentage();
    
    console.log("💰 Fee structure:");
    console.log("  - Charity:", charityFee.toString() + "%");
    console.log("  - Maintenance:", maintenanceFee.toString() + "%");
    console.log("  - Total:", totalFee.toString() + "%");
    
    const owner = await contract.owner();
    console.log("👑 Contract owner:", owner);
    
    console.log("✅ Contract verification successful!");
    
  } catch (error) {
    console.warn("⚠️ Could not verify deployment:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    transactionHash: contract.deploymentTransaction().hash,
    timestamp: new Date().toISOString(),
    parameters: {
      charityAddress,
      maintenanceAddress
    },
    verification: {
      totalPredictions: "0",
      charityFeePercentage: "15",
      maintenanceFeePercentage: "5",
      totalFeePercentage: "20"
    }
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to network-specific file
  const networkFile = path.join(deploymentsDir, `${networkName.toLowerCase().replace(/\s+/g, '-')}.json`);
  fs.writeFileSync(networkFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📄 Deployment info saved to:", networkFile);

  // Generate explorer URL
  let explorerUrl = "";
  if (network.chainId === 84532n) {
    explorerUrl = `https://sepolia.basescan.org/address/${contractAddress}`;
  } else if (network.chainId === 42220n) {
    explorerUrl = `https://celoscan.io/address/${contractAddress}`;
  }

  if (explorerUrl) {
    console.log("🔗 Explorer URL:", explorerUrl);
  }

  console.log("\n🎉 Deployment complete!");
  console.log("📋 Next steps:");
  console.log("1. Update lib/dual-chain-service.ts with the new contract address");
  console.log("2. Test the contract functionality");
  console.log("3. Deploy to the other network if needed");

  return {
    contractAddress,
    network: networkName,
    chainId: network.chainId.toString(),
    explorerUrl
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
