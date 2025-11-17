import type { NextApiRequest, NextApiResponse } from 'next';
import { sweatEquityBotService } from '@/lib/sweat-equity-bot-integration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const { userAddress, predictionId, exerciseType, targetAmount } = req.body as {
      userAddress: string;
      predictionId: number;
      exerciseType: number;
      targetAmount: number;
    };
    if (!userAddress || !predictionId || exerciseType === undefined || !targetAmount) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    const result = await sweatEquityBotService.createChallenge(
      Number(predictionId),
      Number(exerciseType),
      Number(targetAmount),
      String(userAddress)
    );
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Failed to create challenge' });
    }
    return res.status(200).json({ success: true, challengeId: result.challengeId, txHash: result.txHash });
  } catch (error) {
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
  }
}