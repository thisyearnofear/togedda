import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to get XMTP bot status
 * GET /api/xmtp/bot-status
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if bot environment variables are configured
    const botConfigured = !!(
      process.env.BOT_PRIVATE_KEY &&
      process.env.ENCRYPTION_KEY &&
      process.env.XMTP_ENV
    );

    const status = {
      online: botConfigured,
      address: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured',
      environment: process.env.XMTP_ENV || 'Not configured',
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ 
      error: 'Failed to get bot status',
      online: false,
      address: 'Error',
      environment: 'Error'
    });
  }
}
