/**
 * Simple inspection of AgentKit package structure
 */

require('dotenv').config({ path: '.env.local' });

async function inspectAgentKit() {
  console.log('🔍 Inspecting AgentKit Package Structure\n');

  try {
    console.log('📦 Loading @coinbase/agentkit...');
    const agentkit = require('@coinbase/agentkit');
    
    console.log('✅ Package loaded successfully');
    console.log('📋 Available exports:');
    Object.keys(agentkit).forEach(key => {
      const value = agentkit[key];
      const type = typeof value;
      console.log(`  - ${key}: ${type}`);
      
      if (type === 'function' && value.prototype) {
        console.log(`    Methods: ${Object.getOwnPropertyNames(value.prototype).filter(name => name !== 'constructor').join(', ')}`);
      }
      
      if (type === 'object' && value !== null) {
        console.log(`    Properties: ${Object.keys(value).slice(0, 5).join(', ')}${Object.keys(value).length > 5 ? '...' : ''}`);
      }
    });

    // Check if there's a default export
    if (agentkit.default) {
      console.log('\n📋 Default export:');
      console.log(`  Type: ${typeof agentkit.default}`);
      if (typeof agentkit.default === 'object') {
        console.log(`  Properties: ${Object.keys(agentkit.default).slice(0, 10).join(', ')}`);
      }
    }

    // Try to find wallet-related functions
    console.log('\n🔍 Looking for wallet-related exports...');
    Object.keys(agentkit).forEach(key => {
      if (key.toLowerCase().includes('wallet') || key.toLowerCase().includes('cdp') || key.toLowerCase().includes('agent')) {
        console.log(`  Found: ${key} (${typeof agentkit[key]})`);
      }
    });

    // Check AgentKit class specifically
    if (agentkit.AgentKit) {
      console.log('\n🤖 AgentKit class details:');
      console.log(`  Type: ${typeof agentkit.AgentKit}`);
      console.log(`  Prototype methods: ${Object.getOwnPropertyNames(agentkit.AgentKit.prototype).join(', ')}`);
      console.log(`  Static methods: ${Object.getOwnPropertyNames(agentkit.AgentKit).filter(name => typeof agentkit.AgentKit[name] === 'function').join(', ')}`);
    }

  } catch (error) {
    console.log(`❌ Failed to load AgentKit: ${error.message}`);
  }

  try {
    console.log('\n📦 Loading @coinbase/agentkit-langchain...');
    const agentkitLangchain = require('@coinbase/agentkit-langchain');
    
    console.log('✅ Langchain package loaded successfully');
    console.log('📋 Available exports:');
    Object.keys(agentkitLangchain).forEach(key => {
      console.log(`  - ${key}: ${typeof agentkitLangchain[key]}`);
    });

  } catch (error) {
    console.log(`❌ Failed to load AgentKit Langchain: ${error.message}`);
  }
}

inspectAgentKit().catch(console.error);
