/**
 * Test script to debug dual-chain prediction fetching
 */

const { getAllChainPredictions } = require('../lib/dual-chain-service.ts');

async function testDualChainFetch() {
  console.log('🔍 Testing dual-chain prediction fetching...');
  
  try {
    const predictions = await getAllChainPredictions();
    
    console.log(`\n📊 Total predictions found: ${predictions.length}`);
    
    // Group by chain
    const celoCount = predictions.filter(p => p.chain === 'celo').length;
    const baseCount = predictions.filter(p => p.chain === 'base').length;
    
    console.log(`🟡 CELO predictions: ${celoCount}`);
    console.log(`🔵 Base predictions: ${baseCount}`);
    
    // Show Base predictions in detail
    const basePredictions = predictions.filter(p => p.chain === 'base');
    console.log('\n🔵 Base Sepolia Predictions:');
    basePredictions.forEach((pred, index) => {
      console.log(`  ${index + 1}. ID: ${pred.id}`);
      console.log(`     Title: ${pred.title}`);
      console.log(`     Network: "${pred.network}"`);
      console.log(`     Status: ${pred.status} (0=ACTIVE, 1=RESOLVED, 2=CANCELLED)`);
      console.log(`     Creator: ${pred.creator}`);
      console.log('');
    });
    
    return predictions;
    
  } catch (error) {
    console.error('❌ Error testing dual-chain fetch:', error);
    throw error;
  }
}

// Run the test
testDualChainFetch()
  .then((predictions) => {
    console.log('✅ Dual-chain fetch test completed');
    console.log(`📈 Found ${predictions.length} total predictions`);
  })
  .catch((error) => {
    console.error('❌ Dual-chain fetch test failed:', error);
    process.exit(1);
  });
