import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint for AgentKit message processing
 * This keeps AgentKit server-side only to prevent build issues
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userAddress } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Import AgentKit integration server-side only
    const { getAgentKitInstance } = await import('../../../lib/agentkit-integration');
    
    // Get AgentKit instance
    const agentKit = await getAgentKitInstance();
    
    // Process the message
    const response = await agentKit.processMessage(message, userAddress);
    
    return res.status(200).json({
      success: true,
      response,
      agentKitAvailable: agentKit.agentKitAvailable
    });

  } catch (error) {
    console.error('❌ AgentKit API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      agentKitAvailable: false
    });
  }
}
