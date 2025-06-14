import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to get XMTP message queue status
 * GET /api/xmtp/queue-status
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import queue functions
    const { getQueueStats } = await import('../../../lib/xmtp-message-queue');
    
    const stats = getQueueStats();
    
    res.status(200).json({
      status: 'ok',
      queue: stats,
      timestamp: new Date().toISOString(),
      botConfiguration: {
        botPrivateKey: !!process.env.BOT_PRIVATE_KEY,
        encryptionKey: !!process.env.ENCRYPTION_KEY,
        xmtpEnv: process.env.XMTP_ENV || 'not_set',
        openaiKey: !!process.env.OPENAI_API_KEY,
        botAddress: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'not_set'
      }
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ 
      error: 'Failed to get queue status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
