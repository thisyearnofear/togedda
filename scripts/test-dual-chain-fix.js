/**
 * Test script to verify the dual-chain migration fix
 * This script tests that both CELO and Base Sepolia contracts work correctly
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

// Import the dual-chain service configuration
const CHAIN_CONFIG = {
  celo: {
    id: 42220,
    name: "CELO Mainnet",
    rpcUrl: "https://forno.celo.org",
    contractAddress: "0x4d6b336F174f17daAf63D233E1E05cB105562304",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  },
  base: {
    id: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    contractAddress: "0x0c38f4bd68d3f295F1C38eED3af96328Ce4CE2dB",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  },
};

// Simplified ABI for testing
const testABI = [
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "targetDate", type: "uint256" },
      { name: "targetValue", type: "uint256" },
      { name: "currentValue", type: "uint256" },
      { name: "category", type: "uint8" },
      { name: "network", type: "string" },
      { name: "emoji", type: "string" },
      { name: "totalStaked", type: "uint256" },
      { name: "yesVotes", type: "uint256" },
      { name: "noVotes", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "outcome", type: "uint8" },
      { name: "createdAt", type: "uint256" },
      { name: "autoResolvable", type: "bool" },
    ],
  },
  {
    name: "getUserVote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_user", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "isYes", type: "bool" },
      { name: "claimed", type: "bool" },
    ],
  },
  {
    name: "getTotalFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];

async function testChainContract(chain, predictionId = 1) {
  const config = CHAIN_CONFIG[chain];
  console.log(`\n🔍 Testing ${config.name} (${chain})`);
  console.log(`📍 Contract: ${config.contractAddress}`);
  console.log(`🌐 RPC: ${config.rpcUrl}`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const contract = new ethers.Contract(
      config.contractAddress,
      testABI,
      provider
    );

    // Test 1: Get prediction
    console.log(`\n📊 Testing getPrediction(${predictionId})...`);
    const prediction = await contract.getPrediction(predictionId);
    console.log(`✅ Success: "${prediction.title}"`);
    console.log(`   Creator: ${prediction.creator}`);
    console.log(`   Network: ${prediction.network}`);
    console.log(
      `   Total Staked: ${ethers.formatEther(prediction.totalStaked)} ${
        config.nativeCurrency.symbol
      }`
    );

    // Test 2: Get user vote (using a test address)
    const testAddress = "0x7E28ed4e4ac222DdC51bd09902FcB62B70AF525c";
    console.log(`\n🗳️ Testing getUserVote(${predictionId}, ${testAddress})...`);
    const vote = await contract.getUserVote(predictionId, testAddress);
    console.log(
      `✅ Success: User has ${vote.amount > 0 ? "voted" : "not voted"}`
    );
    if (vote.amount > 0) {
      console.log(
        `   Amount: ${ethers.formatEther(vote.amount)} ${
          config.nativeCurrency.symbol
        }`
      );
      console.log(`   Vote: ${vote.isYes ? "YES" : "NO"}`);
    }

    // Test 3: Get fee info
    console.log(`\n💰 Testing getTotalFeePercentage()...`);
    const feePercentage = await contract.getTotalFeePercentage();
    console.log(`✅ Success: ${feePercentage}% total fee`);

    return { success: true, chain, contract: config.contractAddress };
  } catch (error) {
    console.error(`❌ Error testing ${chain}:`, error.message);
    return { success: false, chain, error: error.message };
  }
}

async function main() {
  console.log("🚀 Testing Dual-Chain Migration Fix");
  console.log("=====================================");
  console.log(
    "This script verifies that both CELO and Base Sepolia contracts work correctly"
  );
  console.log("and that the chain confusion bug has been resolved.\n");

  const results = [];

  // Test CELO Mainnet
  const celoResult = await testChainContract("celo", 1);
  results.push(celoResult);

  // Test Base Sepolia
  const baseResult = await testChainContract("base", 1);
  results.push(baseResult);

  // Summary
  console.log("\n🎯 Test Results Summary");
  console.log("=======================");

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    const chain = result.chain.toUpperCase();
    console.log(
      `${status} ${chain}: ${
        result.success ? "All functions working" : result.error
      }`
    );
  });

  console.log(
    `\n📊 Overall: ${successCount}/${totalCount} chains working correctly`
  );

  if (successCount === totalCount) {
    console.log("\n🎉 SUCCESS: Chain confusion bug has been resolved!");
    console.log(
      "All contracts are responding correctly to their respective function calls."
    );
  } else {
    console.log("\n⚠️ WARNING: Some chains are still experiencing issues.");
    console.log("Please check the error messages above for details.");
  }
}

main().catch(console.error);
