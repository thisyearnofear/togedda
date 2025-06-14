import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Autonomous SweatEquityBot Verification API
 * Uses AgentKit for AI-powered exercise verification and autonomous approval
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { challengeId, verificationProof } = req.body;

    if (!challengeId || !verificationProof) {
      return res.status(400).json({ 
        error: 'Challenge ID and verification proof required' 
      });
    }

    console.log(`🤖 Starting autonomous verification for challenge ${challengeId}`);

    // Import SweatEquityBot service
    const { sweatEquityBotService } = await import('../../../lib/sweat-equity-bot-integration');

    // Get challenge details
    const challenge = await sweatEquityBotService.getChallenge(challengeId);
    if (!challenge) {
      return res.status(404).json({ 
        error: 'Challenge not found' 
      });
    }

    // Check if challenge is still valid
    const now = Math.floor(Date.now() / 1000);
    if (now > challenge.deadline) {
      return res.status(400).json({ 
        error: 'Challenge expired' 
      });
    }

    if (challenge.completed) {
      return res.status(400).json({ 
        error: 'Challenge already completed' 
      });
    }

    console.log('📋 Challenge details:', {
      id: challengeId,
      user: challenge.user,
      exerciseType: challenge.exerciseType,
      targetAmount: challenge.targetAmount,
      deadline: new Date(challenge.deadline * 1000).toISOString()
    });

    // Perform autonomous AI verification
    const verificationResult = await sweatEquityBotService.autonomousVerification(
      challengeId,
      verificationProof
    );

    if (verificationResult) {
      console.log('✅ Autonomous verification and approval successful');
      
      // Get updated challenge status
      const updatedChallenge = await sweatEquityBotService.getChallenge(challengeId);
      
      return res.status(200).json({
        success: true,
        message: 'Sweat equity challenge verified and approved autonomously',
        challengeId,
        approved: true,
        challenge: updatedChallenge,
        autonomous: true,
        verificationMethod: 'ai-autonomous'
      });
    } else {
      console.log('❌ Autonomous verification rejected the proof');
      
      return res.status(400).json({
        success: false,
        message: 'Verification proof rejected by AI analysis',
        challengeId,
        approved: false,
        autonomous: true,
        verificationMethod: 'ai-autonomous'
      });
    }

  } catch (error) {
    console.error('❌ Autonomous verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      autonomous: true
    });
  }
}

/**
 * Additional endpoint for generating challenge recommendations
 */
export async function generateChallengeRecommendations(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress, predictionId, stakeAmount } = req.body;

    if (!userAddress || !predictionId || !stakeAmount) {
      return res.status(400).json({ 
        error: 'User address, prediction ID, and stake amount required' 
      });
    }

    console.log(`🎯 Generating challenge recommendations for user ${userAddress}`);

    const { sweatEquityBotService } = await import('../../../lib/sweat-equity-bot-integration');

    // Check if user is eligible for sweat equity
    const canCreate = await sweatEquityBotService.canCreateSweatEquity(predictionId, userAddress);
    if (!canCreate) {
      return res.status(400).json({ 
        error: 'User not eligible for sweat equity on this prediction' 
      });
    }

    // Generate AI-powered recommendations
    const recommendations = await sweatEquityBotService.generateChallengeRecommendations(
      userAddress,
      predictionId,
      stakeAmount
    );

    // Get user's current stats for context
    const userStats = await sweatEquityBotService.getUserStats(userAddress);

    return res.status(200).json({
      success: true,
      recommendations,
      userStats,
      context: {
        predictionId,
        stakeAmount,
        recoverableAmount: (parseFloat(stakeAmount) * 0.8).toFixed(4) + ' ETH',
        timeWindow: '24 hours'
      }
    });

  } catch (error) {
    console.error('❌ Challenge recommendation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
