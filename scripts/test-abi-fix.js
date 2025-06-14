/**
 * Test script to verify the ABI fix is working correctly
 */

const { ethers } = require('ethers');

// Import the dual-chain service to test
async function testABIFix() {
  console.log('🧪 Testing ABI Fix...');
  console.log('===================');
  
  try {
    // Test 1: Import the dual-chain service
    console.log('1️⃣ Testing dual-chain service import...');
    const { getChainContract, getChainUserVote, getChainFeeInfo } = require('../lib/dual-chain-service.ts');
    console.log('✅ Dual-chain service imported successfully');
    
    // Test 2: Create Base Sepolia contract instance
    console.log('\\n2️⃣ Testing Base Sepolia contract creation...');
    const baseContract = getChainContract('base');
    console.log('✅ Base Sepolia contract created successfully');
    
    // Test 3: Test fee functions
    console.log('\\n3️⃣ Testing Base Sepolia fee functions...');
    const charityFee = await baseContract.charityFeePercentage();
    console.log('✅ charityFeePercentage:', charityFee.toString());
    
    const maintenanceFee = await baseContract.maintenanceFeePercentage();
    console.log('✅ maintenanceFeePercentage:', maintenanceFee.toString());
    
    const totalFee = await baseContract.getTotalFeePercentage();
    console.log('✅ getTotalFeePercentage:', totalFee.toString());
    
    // Test 4: Test getUserVote function
    console.log('\\n4️⃣ Testing getUserVote function...');
    const testAddress = '0x3d86ff165d8beb8594ae05653249116a6d1ff3f1';
    const vote = await baseContract.getUserVote(1, testAddress);
    console.log('✅ getUserVote:', {
      isYes: vote.isYes,
      amount: vote.amount.toString(),
      claimed: vote.claimed
    });
    
    // Test 5: Test dual-chain service functions
    console.log('\\n5️⃣ Testing dual-chain service functions...');
    const userVote = await getChainUserVote(1, testAddress, 'base');
    console.log('✅ getChainUserVote:', userVote);
    
    const feeInfo = await getChainFeeInfo('base');
    console.log('✅ getChainFeeInfo:', feeInfo);
    
    console.log('\\n🎉 All ABI tests passed!');
    console.log('✅ Base Sepolia ABI is working correctly');
    console.log('✅ Dual-chain service is functioning properly');
    console.log('✅ No more "missing revert data" errors');
    
  } catch (error) {
    console.error('❌ ABI test failed:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testABIFix().catch(console.error);
