import { NextRequest, NextResponse } from "next/server";
import { ethers } from 'ethers';
import { createChainPrediction, SupportedChain, CHAIN_CONFIG } from '@/lib/services/dual-chain-service';
import { CreatePredictionRequest } from '@/lib/xmtp-prediction-helpers';

/**
 * API endpoint for creating predictions through the XMTP bot
 * POST /api/xmtp/create-prediction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      targetDate,
      targetValue,
      category,
      network,
      emoji,
      userAddress,
      autoResolvable = false,
      chain = 'base' // Default to Base for hackathon
    }: CreatePredictionRequest = body;

    // Validate required fields
    if (!title || !description || !targetDate || !userAddress) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: title, description, targetDate, userAddress'
      }, { status: 400 });
    }

    // Validate target date is in the future
    if (targetDate <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({
        success: false,
        message: 'Target date must be in the future'
      }, { status: 400 });
    }

    // Determine which chain to use based on network preference
    const targetChain: SupportedChain = chain || (network?.toLowerCase().includes('celo') ? 'celo' : 'base');
    const chainConfig = CHAIN_CONFIG[targetChain];

    console.log(`🔄 Creating prediction on ${chainConfig.name}: ${title}`);

    // Set up provider and signer for the target chain
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
      name: chainConfig.name,
      chainId: chainConfig.id
    });

    // For bot-created predictions, we need a bot wallet with native currency
    const botPrivateKey = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!botPrivateKey) {
      return NextResponse.json({
        success: false,
        message: 'Bot wallet not configured'
      }, { status: 500 });
    }

    const botWallet = new ethers.Wallet(botPrivateKey, provider);

    // Use the unified dual-chain service to create the prediction
    const result = await createChainPrediction(
      targetChain,
      {
        title,
        description,
        targetDate,
        targetValue: targetValue || 0,
        category: category || 3, // Default to CUSTOM category
        network: network || targetChain,
        emoji: emoji || '🔮',
        autoResolvable
      },
      botWallet
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to create prediction',
        error: result.error
      }, { status: 500 });
    }

    console.log(`✅ Prediction created successfully on ${chainConfig.name}: ${result.txHash}`);

    return NextResponse.json({
      success: true,
      transactionHash: result.txHash,
      message: `Prediction "${title}" created successfully on ${chainConfig.name}! Transaction: ${result.txHash}`,
      chain: targetChain,
      explorerUrl: `${chainConfig.blockExplorer}/tx/${result.txHash}`
    });

  } catch (error: any) {
    console.error('Error creating prediction:', error);
    
    let errorMessage = 'Failed to create prediction';

    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient balance to create prediction. Please ensure you have enough tokens for gas fees.';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error - please try again';
    } else if (error.message?.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error.message
    }, { status: 500 });
  }
}


