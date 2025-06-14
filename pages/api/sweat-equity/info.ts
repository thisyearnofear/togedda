import { NextApiRequest, NextApiResponse } from 'next';

/**
 * SweatEquityBot Information API
 * Provides key information about the revolutionary fitness-backed prediction system
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📊 Fetching SweatEquityBot information...');

    // SweatEquityBot core information
    const sweatEquityInfo = {
      contract: {
        address: "0x89ED0a9739801634A61e791aB57ADc3298B685e9",
        network: "Base Mainnet",
        chainId: 8453,
        verified: true,
        basescanUrl: "https://basescan.org/address/0x89ED0a9739801634A61e791aB57ADc3298B685e9#code"
      },

      economics: {
        recoverablePercent: 80,
        charityFeePercent: 15,
        maintenanceFeePercent: 5,
        challengeWindow: "24 hours",
        currency: "ETH"
      },

      features: [
        {
          title: "80% Stake Recovery",
          description: "Recover 80% of lost prediction stakes through verified exercise completion",
          icon: "💰",
          revolutionary: true
        },
        {
          title: "Real On-Chain Data",
          description: "Uses actual exercise data from imperfectform.fun stored on blockchain",
          icon: "⛓️",
          revolutionary: true
        },
        {
          title: "AI-Powered Verification",
          description: "AgentKit autonomous verification - no manual proof needed",
          icon: "🤖",
          revolutionary: true
        },
        {
          title: "Cross-Chain Aggregation",
          description: "Aggregates fitness data from Base, CELO, Polygon, and Monad",
          icon: "🌐",
          revolutionary: false
        },
        {
          title: "Achievement NFTs",
          description: "Earn collectible NFTs for completed sweat equity challenges",
          icon: "🏆",
          revolutionary: false
        },
        {
          title: "Fraud-Proof System",
          description: "Impossible to fake blockchain exercise data",
          icon: "🛡️",
          revolutionary: true
        }
      ],

      userFlow: [
        {
          step: 1,
          title: "Create Prediction",
          description: "Make a fitness prediction and stake ETH",
          example: "I'll do 1000 pushups by tomorrow",
          stake: "0.1 ETH"
        },
        {
          step: 2,
          title: "Exercise Reality",
          description: "Complete exercise on imperfectform.fun (data stored on-chain)",
          example: "Actually do 800 pushups",
          result: "Prediction fails"
        },
        {
          step: 3,
          title: "Sweat Equity Offer",
          description: "SweatEquityBot offers recovery challenge",
          example: "Complete +200 more pushups in 24h to recover 80%",
          recoverable: "0.08 ETH"
        },
        {
          step: 4,
          title: "Additional Exercise",
          description: "AI monitors real on-chain fitness data",
          example: "Do more exercise, data updates automatically",
          verification: "Autonomous"
        },
        {
          step: 5,
          title: "Stake Recovery",
          description: "Get ETH back + achievement NFT",
          example: "Receive 0.08 ETH + SweatEquity NFT",
          outcome: "Losing becomes winning! 💪"
        }
      ],

      exerciseTypes: [
        {
          type: 0,
          name: "Pushups",
          description: "Track pushup completion across all networks",
          networks: ["Base", "CELO", "Polygon", "Monad"]
        },
        {
          type: 1,
          name: "Squats",
          description: "Track squat completion across all networks",
          networks: ["Base", "CELO", "Polygon", "Monad"]
        }
      ],

      competitiveAdvantages: [
        "World's first fitness-backed prediction market",
        "No competitor has real on-chain exercise verification",
        "Revolutionary concept that transforms losses into wins",
        "Creates genuine fitness motivation beyond speculation",
        "Sustainable economics aligned with user success",
        "Viral potential through shareable fitness achievements"
      ],

      demoScript: {
        title: "The Ultimate Fitness Prediction Revolution",
        duration: "2 minutes",
        steps: [
          {
            time: "0:00-0:15",
            action: "Setup",
            description: "Welcome to the world's first fitness-backed prediction market!"
          },
          {
            time: "0:15-0:30",
            action: "Problem",
            description: "Traditional predictions: lose money = money gone forever"
          },
          {
            time: "0:30-1:15",
            action: "Solution",
            description: "Show: Create fitness prediction, real cross-chain data, SweatEquityBot contract"
          },
          {
            time: "1:15-1:45",
            action: "Magic",
            description: "Prediction fails → SweatEquityBot offers recovery → AI verifies completion → 80% recovery"
          },
          {
            time: "1:45-2:00",
            action: "Impact",
            description: "Completely unique! Transforms speculation into fitness motivation!"
          }
        ]
      },

      technicalSpecs: {
        solidity: "0.8.20",
        security: ["ReentrancyGuard", "Ownable", "Input validation"],
        frontend: "Next.js 15, React 19, TypeScript",
        ai: "AgentKit autonomous verification",
        blockchain: "Base Mainnet (8453)",
        gasOptimized: true,
        crossChain: true
      },

      marketImpact: {
        newCategory: "First-of-its-kind fitness-backed predictions",
        viralMechanics: "Shareable fitness achievements",
        socialGood: "15% of stakes go to fitness charity",
        userRetention: "Transforms negative outcomes into positive motivation",
        scalability: "Extensible to all exercise types and networks"
      },

      status: {
        deployed: true,
        verified: true,
        tested: true,
        production: true,
        revolutionary: true
      }
    };

    console.log('✅ SweatEquityBot information compiled successfully');

    return res.status(200).json({
      success: true,
      message: "SweatEquityBot - World's First Fitness-Backed Prediction Market",
      data: sweatEquityInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching SweatEquityBot info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
