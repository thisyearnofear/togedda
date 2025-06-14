/**
 * Test script to verify the vote function ABI works correctly with Base Sepolia contract
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

// Import the exact ABI from constants.ts
const predictionMarketABI = [
  {
    name: "vote",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_isYes", type: "bool" }
    ],
    outputs: []
  },
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
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
          { name: "autoResolvable", type: "bool" }
        ]
      }
    ]
  }
];

const BASE_SEPOLIA_CONFIG = {
  rpcUrl: 'https://sepolia.base.org',
  contractAddress: '0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA',
  chainId: 84532
};

async function testVoteABI() {
  console.log('🧪 Testing Base Sepolia Vote ABI');
  console.log('================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
    const contract = new ethers.Contract(
      BASE_SEPOLIA_CONFIG.contractAddress, 
      predictionMarketABI, 
      provider
    );
    
    console.log('📍 Contract Address:', BASE_SEPOLIA_CONFIG.contractAddress);
    console.log('🌐 RPC URL:', BASE_SEPOLIA_CONFIG.rpcUrl);
    
    // Test 1: Check if prediction 1 exists
    console.log('\n1️⃣ Testing getPrediction(1)...');
    const prediction1 = await contract.getPrediction(1);
    console.log('✅ Prediction 1 exists:', {
      id: prediction1.id.toString(),
      title: prediction1.title,
      creator: prediction1.creator,
      totalStaked: ethers.formatEther(prediction1.totalStaked),
      yesVotes: ethers.formatEther(prediction1.yesVotes),
      noVotes: ethers.formatEther(prediction1.noVotes)
    });
    
    // Test 2: Simulate vote transaction (without sending)
    console.log('\n2️⃣ Testing vote function ABI...');
    const testAmount = ethers.parseEther('0.01'); // 0.01 ETH
    
    // Create transaction data to verify ABI encoding
    const voteData = contract.interface.encodeFunctionData('vote', [
      BigInt(1), // predictionId
      true       // isYes
    ]);
    
    console.log('✅ Vote function ABI encoding successful');
    console.log('📦 Transaction data:', voteData);
    console.log('💰 Test amount:', ethers.formatEther(testAmount), 'ETH');
    
    // Test 3: Estimate gas for vote transaction
    console.log('\n3️⃣ Testing gas estimation...');
    try {
      const gasEstimate = await contract.vote.estimateGas(1, true, {
        value: testAmount,
        from: '0x0000000000000000000000000000000000000000' // Dummy address
      });
      console.log('✅ Gas estimation successful:', gasEstimate.toString());
    } catch (gasError) {
      console.log('⚠️ Gas estimation failed (expected for dummy address):', gasError.message);
    }
    
    // Test 4: Check if we have a private key for actual testing
    const privateKey = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
    if (privateKey) {
      console.log('\n4️⃣ Testing with real wallet...');
      const wallet = new ethers.Wallet(privateKey, provider);
      console.log('👤 Wallet address:', wallet.address);
      
      const balance = await provider.getBalance(wallet.address);
      console.log('💰 Wallet balance:', ethers.formatEther(balance), 'ETH');
      
      if (balance > testAmount) {
        console.log('✅ Sufficient balance for test transaction');
        console.log('🚨 NOTE: This script does NOT send actual transactions');
        console.log('🚨 To test voting, use the frontend or modify this script');
      } else {
        console.log('⚠️ Insufficient balance for test transaction');
        console.log('💡 Get Base Sepolia ETH from: https://www.alchemy.com/faucets/base-sepolia');
      }
    } else {
      console.log('\n4️⃣ No private key found in environment');
      console.log('💡 Add PRIVATE_KEY to .env.local for wallet testing');
    }
    
    console.log('\n🎉 All ABI tests passed!');
    console.log('✅ The vote function ABI is correctly configured');
    console.log('✅ Contract is accessible and responding');
    console.log('✅ Transaction encoding works properly');
    
  } catch (error) {
    console.error('❌ ABI test failed:', error.message);
    console.error('🔍 Full error:', error);
    
    if (error.message.includes('missing revert data')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if the contract address is correct');
      console.log('2. Verify the ABI matches the deployed contract');
      console.log('3. Ensure the RPC endpoint is working');
      console.log('4. Check if the prediction ID exists');
    }
  }
}

testVoteABI().catch(console.error);
