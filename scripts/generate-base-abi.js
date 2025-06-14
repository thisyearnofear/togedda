/**
 * Generate the correct ABI for the Base Sepolia contract
 * This script compiles the contract and extracts the ABI
 */

const fs = require('fs');
const path = require('path');

// Manual ABI generation based on the contract source
const baseSepoliaABI = [
  // State variables (public getters)
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "charityAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "maintenanceAddress",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "charityFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "maintenanceFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "nextPredictionId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  
  // Mapping getters
  {
    name: "predictions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
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
  },
  {
    name: "votes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "isYes", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "claimed", type: "bool" }
        ]
      }
    ]
  },
  
  // Main functions
  {
    name: "createPrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_targetDate", type: "uint256" },
      { name: "_targetValue", type: "uint256" },
      { name: "_category", type: "uint8" },
      { name: "_network", type: "string" },
      { name: "_emoji", type: "string" },
      { name: "_autoResolvable", type: "bool" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
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
    name: "claimReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  {
    name: "resolvePrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_outcome", type: "uint8" }
    ],
    outputs: []
  },
  {
    name: "cancelPrediction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_predictionId", type: "uint256" }],
    outputs: []
  },
  
  // Helper functions
  {
    name: "getTotalFeePercentage",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
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
  },
  {
    name: "getUserVote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_predictionId", type: "uint256" },
      { name: "_user", type: "address" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "isYes", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "claimed", type: "bool" }
        ]
      }
    ]
  }
];

// Test the ABI with the actual contract
async function testBaseABI() {
  const { ethers } = require('ethers');
  
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const contractAddress = '0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA';
  
  console.log('🧪 Testing Base Sepolia ABI...');
  
  try {
    const contract = new ethers.Contract(contractAddress, baseSepoliaABI, provider);
    
    // Test fee functions
    console.log('Testing fee functions...');
    const charityFee = await contract.charityFeePercentage();
    console.log('✅ charityFeePercentage:', charityFee.toString());
    
    const maintenanceFee = await contract.maintenanceFeePercentage();
    console.log('✅ maintenanceFeePercentage:', maintenanceFee.toString());
    
    const totalFee = await contract.getTotalFeePercentage();
    console.log('✅ getTotalFeePercentage:', totalFee.toString());
    
    const charityAddr = await contract.charityAddress();
    console.log('✅ charityAddress:', charityAddr);
    
    const maintenanceAddr = await contract.maintenanceAddress();
    console.log('✅ maintenanceAddress:', maintenanceAddr);
    
    // Test getUserVote
    console.log('\\nTesting getUserVote...');
    const vote = await contract.getUserVote(1, '0x3d86ff165d8beb8594ae05653249116a6d1ff3f1');
    console.log('✅ getUserVote:', {
      isYes: vote.isYes,
      amount: vote.amount.toString(),
      claimed: vote.claimed
    });
    
    console.log('\\n🎉 All Base Sepolia ABI tests passed!');
    
    // Save the ABI to a file
    const abiPath = path.join(__dirname, '..', 'lib', 'base-sepolia-abi.json');
    fs.writeFileSync(abiPath, JSON.stringify(baseSepoliaABI, null, 2));
    console.log('💾 ABI saved to:', abiPath);
    
  } catch (error) {
    console.error('❌ ABI test failed:', error.message);
  }
}

if (require.main === module) {
  testBaseABI().catch(console.error);
}

module.exports = { baseSepoliaABI };
