/**
 * API endpoint for user votes with caching
 * GET /api/user-votes?address=0x...
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getAllChainPredictions } from '@/lib/dual-chain-service';

interface UserVote {
  predictionId: number;
  predictionTitle: string;
  chain: string;
  isYes: boolean;
  amount: number;
  timestamp: number;
  status: 'active' | 'resolved' | 'expired';
  outcome?: 'yes' | 'no' | 'unresolved';
  claimed: boolean;
  potentialReward?: number;
}

interface UserVotesResponse {
  success: boolean;
  votes?: UserVote[];
  summary?: {
    totalVotes: number;
    totalStaked: number;
    activeVotes: number;
    resolvedVotes: number;
    winningVotes: number;
    totalRewards: number;
    unclaimedRewards: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserVotesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // In a real implementation, this would query the blockchain or database
    // For now, we'll simulate user votes based on the address
    const predictions = await getAllChainPredictions();
    
    // Simulate user votes (in production, this would come from contract events or database)
    const userVotes: UserVote[] = [];
    
    // For demo purposes, create some sample votes for specific addresses
    if (address.toLowerCase() === '0x55a5705453ee82c742274154136fce8149597058') {
      // Test user papa with some sample votes
      userVotes.push({
        predictionId: 1,
        predictionTitle: 'The celo community will not reach 10,000 total squats by 15th June 2025',
        chain: 'celo',
        isYes: false, // Betting against the negative prediction (so betting FOR reaching 10k squats)
        amount: 2.5,
        timestamp: Date.now() - 86400000, // 1 day ago
        status: 'active',
        outcome: 'unresolved',
        claimed: false,
      });
      
      userVotes.push({
        predictionId: 3,
        predictionTitle: 'No base user will complete 500 squats in a single week by 15th June 2025',
        chain: 'base',
        isYes: true, // Betting that no one will achieve this
        amount: 0.01,
        timestamp: Date.now() - 172800000, // 2 days ago
        status: 'active',
        outcome: 'unresolved',
        claimed: false,
      });
    }

    // Calculate summary statistics
    const totalVotes = userVotes.length;
    const totalStaked = userVotes.reduce((sum, vote) => sum + vote.amount, 0);
    const activeVotes = userVotes.filter(vote => vote.status === 'active').length;
    const resolvedVotes = userVotes.filter(vote => vote.status === 'resolved').length;
    const winningVotes = userVotes.filter(vote => 
      vote.status === 'resolved' && 
      ((vote.outcome === 'yes' && vote.isYes) || (vote.outcome === 'no' && !vote.isYes))
    ).length;
    
    const totalRewards = userVotes
      .filter(vote => vote.potentialReward)
      .reduce((sum, vote) => sum + (vote.potentialReward || 0), 0);
    
    const unclaimedRewards = userVotes
      .filter(vote => vote.potentialReward && !vote.claimed)
      .reduce((sum, vote) => sum + (vote.potentialReward || 0), 0);

    res.status(200).json({
      success: true,
      votes: userVotes,
      summary: {
        totalVotes,
        totalStaked,
        activeVotes,
        resolvedVotes,
        winningVotes,
        totalRewards,
        unclaimedRewards,
      },
    });

  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user votes',
    });
  }
}
