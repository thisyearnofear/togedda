#!/usr/bin/env ts-node

/**
 * XMTP Fitness Agent Startup Script
 * Following official XMTP agent patterns from ephemeraHQ/xmtp-agent-examples
 * Optimized for Base Batches Messaging Buildathon
 */

import { fitnessAgent } from '../../lib/xmtp-agent-service';

async function startAgent() {
  console.log('🚀 Starting XMTP Fitness Agent for Base Batches Buildathon...\n');

  try {
    // Initialize the agent
    console.log('1️⃣ Initializing agent...');
    await fitnessAgent.initialize();

    // Start the agent
    console.log('2️⃣ Starting message streaming...');
    await fitnessAgent.start();

    // Display status
    const status = fitnessAgent.getStatus();
    console.log('\n✅ Agent Status:');
    console.log(`   • Running: ${status.isRunning}`);
    console.log(`   • Inbox ID: ${status.inboxId}`);
    console.log(`   • Group Fitness: ${status.config.enableGroupFitness ? '✅' : '❌'}`);
    console.log(`   • Prediction Markets: ${status.config.enablePredictionMarkets ? '✅' : '❌'}`);
    console.log(`   • Basenames: ${status.config.enableBasenames ? '✅' : '❌'}`);

    console.log('\n🎯 Agent is now active! Try messaging it on XMTP:');
    console.log('   • "Hello" - Get started');
    console.log('   • "I predict I\'ll do 500 pushups by March 1st" - Create prediction');
    console.log('   • "/challenge pushups 1000 7" - Start group challenge');
    console.log('   • "/help" - See all commands');

    console.log('\n🌐 Test the agent at: https://xmtp.chat');
    console.log(`📧 Agent address: ${process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured'}`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Shutting down agent...');
      await fitnessAgent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Shutting down agent...');
      await fitnessAgent.stop();
      process.exit(0);
    });

    // Keep the process alive
    console.log('\n💡 Press Ctrl+C to stop the agent\n');

  } catch (error) {
    console.error('❌ Failed to start agent:', error);
    process.exit(1);
  }
}

// Start the agent
startAgent().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
