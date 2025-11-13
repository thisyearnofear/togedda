#!/usr/bin/env node

/**
 * Lightweight Bot Service Starter
 * Starts the XMTP bot service with minimal memory usage
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Imperfect Form XMTP Bot Service...');

// Start health server first
const healthServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' && req.method === 'GET') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'production',
        xmtpEnv: process.env.XMTP_ENV || 'not_set',
        hasBotKey: !!process.env.BOT_PRIVATE_KEY,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
      }
    };
    res.writeHead(200);
    res.end(JSON.stringify(health, null, 2));
  } else if (req.url === '/status' && req.method === 'GET') {
    const status = {
      online: !!(process.env.BOT_PRIVATE_KEY && process.env.ENCRYPTION_KEY),
      address: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured',
      environment: process.env.XMTP_ENV || 'Not configured',
      lastUpdated: new Date().toISOString(),
    };
    res.writeHead(200);
    res.end(JSON.stringify(status, null, 2));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

healthServer.listen(3001, '0.0.0.0', () => {
  console.log('🏥 Health server running on port 3001');
});

// Start the main bot service with ts-node
const botProcess = spawn('npx', [
  'ts-node',
  '--project', 'tsconfig.node.json',
  '--transpile-only', // Skip type checking for faster startup
  'lib/services/ai-bot-service.ts'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=256' // Limit memory usage
  }
});

botProcess.on('error', (error) => {
  console.error('❌ Bot process error:', error);
  process.exit(1);
});

botProcess.on('exit', (code, signal) => {
  console.log(`🛑 Bot process exited with code ${code} and signal ${signal}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  botProcess.kill('SIGTERM');
  healthServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down...');
  botProcess.kill('SIGINT');
  healthServer.close();
  process.exit(0);
});
