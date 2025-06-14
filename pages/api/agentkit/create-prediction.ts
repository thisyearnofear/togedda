import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint for AgentKit prediction creation
 * This keeps AgentKit server-side only to prevent build issues
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { predictionData, userAddress } = req.body;

    console.log('🔍 AgentKit API received:', {
      predictionData: predictionData ? 'present' : 'missing',
      userAddress: userAddress || 'missing/empty',
      userAddressLength: userAddress?.length || 0
    });

    if (!predictionData || !userAddress || userAddress === '0x' || userAddress.length < 10) {
      return res.status(400).json({
        error: 'Prediction data and valid user address are required',
        received: { predictionData: !!predictionData, userAddress }
      });
    }

    // Import AgentKit integration server-side only
    const { getAgentKitInstance } = await import('../../../lib/agentkit-integration');
    
    // Get AgentKit instance
    const agentKit = await getAgentKitInstance();
    
    // Create prediction with AgentKit
    const result = await agentKit.createPredictionWithAgentKit(predictionData, userAddress);
    
    return res.status(200).json({
      success: result.success,
      txHash: result.txHash,
      error: result.error,
      gasless: result.gasless
    });

  } catch (error) {
    console.error('❌ AgentKit prediction creation API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
