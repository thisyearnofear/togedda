/**
 * Inspect CdpWalletProvider to find the correct way to create it
 */

require('dotenv').config({ path: '.env.local' });

async function inspectCdpProvider() {
  console.log('🔍 Inspecting CdpWalletProvider\n');

  try {
    const agentkit = require('@coinbase/agentkit');
    
    console.log('📋 CdpWalletProvider details:');
    const CdpWalletProvider = agentkit.CdpWalletProvider;
    
    console.log(`Type: ${typeof CdpWalletProvider}`);
    console.log(`Prototype methods: ${Object.getOwnPropertyNames(CdpWalletProvider.prototype).join(', ')}`);
    console.log(`Static methods: ${Object.getOwnPropertyNames(CdpWalletProvider).filter(name => typeof CdpWalletProvider[name] === 'function').join(', ')}`);
    
    // Check for factory methods
    console.log('\n🏭 Looking for factory methods:');
    Object.getOwnPropertyNames(CdpWalletProvider).forEach(name => {
      if (typeof CdpWalletProvider[name] === 'function' && name !== 'constructor') {
        console.log(`  - ${name}: ${CdpWalletProvider[name].toString().substring(0, 100)}...`);
      }
    });

    // Check if there are any CDP-related helper functions
    console.log('\n🔍 Looking for CDP helper functions:');
    Object.keys(agentkit).forEach(key => {
      if (key.toLowerCase().includes('cdp') && typeof agentkit[key] === 'function') {
        console.log(`  - ${key}: ${typeof agentkit[key]}`);
      }
    });

    // Check for any 'create' or 'configure' functions
    console.log('\n🔧 Looking for creation functions:');
    Object.keys(agentkit).forEach(key => {
      if ((key.toLowerCase().includes('create') || key.toLowerCase().includes('configure') || key.toLowerCase().includes('from')) && typeof agentkit[key] === 'function') {
        console.log(`  - ${key}: ${typeof agentkit[key]}`);
      }
    });

    // Try to find environment-based initialization
    console.log('\n🌍 Checking for environment-based initialization:');
    if (agentkit.cdpWalletProvider) {
      console.log('Found cdpWalletProvider function');
    }

  } catch (error) {
    console.log(`❌ Failed to inspect: ${error.message}`);
  }
}

inspectCdpProvider().catch(console.error);
