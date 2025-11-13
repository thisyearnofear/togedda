import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CHAIN_CONFIG } from '@/lib/services/dual-chain-service';
import { unifiedPredictionMarketABI } from '@/lib/unified-prediction-market-abi';

/**
 * API endpoint to fetch predictions from blockchain (server-side to avoid CORS)
 * GET /api/predictions/fetch?chain=celo&predictionId=1
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chain, predictionId, limit = '10' } = req.query;

    if (!chain || (typeof chain !== 'string') || !['celo', 'base'].includes(chain)) {
      return res.status(400).json({ error: 'Valid chain parameter required (celo or base)' });
    }

    const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
    
    // Create provider (server-side, no CORS issues)
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const contract = new ethers.Contract(
      chainConfig.contractAddress,
      unifiedPredictionMarketABI,
      provider
    );

    if (predictionId) {
      // Fetch single prediction
      console.log(`📡 Fetching prediction ${predictionId} from ${chain}`);
      
      try {
        const prediction = await contract.getPrediction(predictionId);
        
        return res.status(200).json({
          success: true,
          prediction: {
            id: prediction.id.toString(),
            creator: prediction.creator,
            title: prediction.title,
            description: prediction.description,
            targetDate: prediction.targetDate.toString(),
            targetValue: prediction.targetValue.toString(),
            currentValue: prediction.currentValue.toString(),
            category: prediction.category,
            network: prediction.network,
            emoji: prediction.emoji,
            totalStaked: prediction.totalStaked.toString(),
            yesVotes: prediction.yesVotes.toString(),
            noVotes: prediction.noVotes.toString(),
            status: prediction.status,
            outcome: prediction.outcome,
            createdAt: prediction.createdAt.toString(),
            autoResolvable: prediction.autoResolvable,
            chain: chain
          }
        });
      } catch (error) {
        console.error(`❌ Error fetching prediction ${predictionId}:`, error);
        return res.status(404).json({ 
          success: false, 
          error: `Prediction ${predictionId} not found on ${chain}` 
        });
      }
    } else {
      // Fetch multiple predictions
      console.log(`📡 Fetching predictions from ${chain} (limit: ${limit})`);
      
      try {
        const totalPredictions = await contract.getTotalPredictions();
        const total = Number(totalPredictions);
        const limitNum = Math.min(Number(limit), 50); // Max 50 predictions
        
        const predictions = [];
        const startId = Math.max(1, total - limitNum + 1);
        
        for (let i = startId; i <= total; i++) {
          try {
            const prediction = await contract.getPrediction(i);
            predictions.push({
              id: prediction.id.toString(),
              creator: prediction.creator,
              title: prediction.title,
              description: prediction.description,
              targetDate: prediction.targetDate.toString(),
              targetValue: prediction.targetValue.toString(),
              currentValue: prediction.currentValue.toString(),
              category: prediction.category,
              network: prediction.network,
              emoji: prediction.emoji,
              totalStaked: prediction.totalStaked.toString(),
              yesVotes: prediction.yesVotes.toString(),
              noVotes: prediction.noVotes.toString(),
              status: prediction.status,
              outcome: prediction.outcome,
              createdAt: prediction.createdAt.toString(),
              autoResolvable: prediction.autoResolvable,
              chain: chain
            });
          } catch (error) {
            console.warn(`⚠️ Skipping prediction ${i}:`, error);
          }
        }
        
        return res.status(200).json({
          success: true,
          predictions,
          total,
          chain,
          fetched: predictions.length
        });
      } catch (error) {
        console.error(`❌ Error fetching predictions from ${chain}:`, error);
        return res.status(500).json({ 
          success: false, 
          error: `Failed to fetch predictions from ${chain}` 
        });
      }
    }

  } catch (error) {
    console.error('❌ Predictions fetch API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
