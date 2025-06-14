/**
 * Health Check Server for XMTP Bot Service
 * Provides health endpoint for Northflank monitoring
 */

import http from 'http';

export function startHealthServer(port: number = 3001) {
  const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      // Health check endpoint
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          xmtpEnv: process.env.XMTP_ENV || 'not_set',
          hasBotKey: !!process.env.BOT_PRIVATE_KEY,
          hasOpenAI: !!process.env.OPENAI_API_KEY,
          hasRedis: !!(process.env.REDIS_URL && process.env.REDIS_TOKEN),
          hasDatabase: !!process.env.DATABASE_URL,
        },
        version: '1.0.0'
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthStatus, null, 2));
    } else if (req.url === '/status' && req.method === 'GET') {
      // Bot status endpoint
      const botStatus = {
        online: !!(process.env.BOT_PRIVATE_KEY && process.env.ENCRYPTION_KEY),
        address: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured',
        environment: process.env.XMTP_ENV || 'Not configured',
        lastUpdated: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(botStatus, null, 2));
    } else {
      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🏥 Health server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🤖 Bot status: http://localhost:${port}/status`);
  });

  return server;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
