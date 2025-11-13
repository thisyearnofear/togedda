import { NextRequest } from 'next/server';

// Mock data for cross-platform predictions
const MOCK_CROSS_PLATFORM_PREDICTIONS = [
  {
    id: 1,
    title: "Cross-Platform Challenge: Total Exercises Across All Apps",
    description: "Will the combined total of pushups and squats (via ImperfectForm), pullups and jumps (via ImperfectCoach), and situps (via ImperfectAbs) across all three apps reach 10,000 by end of month?",
    targetDate: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
    targetValue: 10000,
    currentValue: 4500,
    category: 0, // Fitness category
    network: "cross-platform",
    emoji: "🏆",
    totalStaked: 1.25,
    yesVotes: 0.75,
    noVotes: 0.50,
    status: 0, // Active
    outcome: 0, // Unresolved
    createdAt: Math.floor(Date.now() / 1000),
    autoResolvable: true,
    platforms: ["imperfectform", "imperfectcoach", "imperfectabs"]
  },
  {
    id: 2,
    title: "Togedda vs ImperfectCoach: Pushups vs Pullups",
    description: "Will pushup completions on Togedda (using ImperfectForm data) exceed pullup completions on ImperfectCoach by end of month?",
    targetDate: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
    targetValue: 0, // Comparative prediction
    currentValue: 0,
    category: 0, // Fitness category
    network: "cross-platform",
    emoji: "🆚",
    totalStaked: 0.85,
    yesVotes: 0.50,
    noVotes: 0.35,
    status: 0, // Active
    outcome: 0, // Unresolved
    createdAt: Math.floor(Date.now() / 1000),
    autoResolvable: true,
    platforms: ["imperfectform", "imperfectcoach"]
  }
];

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'active', 'resolved', 'all'
    const platform = searchParams.get('platform'); // Filter by specific platform
    
    let filteredPredictions = [...MOCK_CROSS_PLATFORM_PREDICTIONS];
    
    // Filter by status if provided
    if (status && status !== 'all') {
      const statusMap: Record<string, number> = {
        active: 0,
        resolved: 1,
        cancelled: 2
      };
      
      filteredPredictions = filteredPredictions.filter(
        pred => pred.status === statusMap[status]
      );
    }
    
    // Filter by platform if provided
    if (platform) {
      filteredPredictions = filteredPredictions.filter(
        pred => pred.platforms.includes(platform)
      );
    }
    
    return Response.json({
      success: true,
      data: filteredPredictions,
      count: filteredPredictions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sports-predictions API:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to fetch cross-platform predictions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      title, 
      description, 
      targetDate, 
      targetValue, 
      platforms = ["imperfectform", "imperfectcoach", "imperfectabs"],
      emoji = "🏆",
      category = 0
    } = body;
    
    if (!title || !targetDate || !Array.isArray(platforms) || platforms.length === 0) {
      return Response.json(
        { 
          success: false, 
          error: 'Missing required fields: title, targetDate, and platforms are required' 
        },
        { status: 400 }
      );
    }
    
    // Create new cross-platform prediction
    const newPrediction = {
      id: MOCK_CROSS_PLATFORM_PREDICTIONS.length + 1,
      title,
      description: description || '',
      targetDate,
      targetValue: targetValue || 0,
      currentValue: 0,
      category,
      network: "cross-platform",
      emoji,
      totalStaked: 0,
      yesVotes: 0,
      noVotes: 0,
      status: 0, // Active
      outcome: 0, // Unresolved
      createdAt: Math.floor(Date.now() / 1000),
      autoResolvable: true,
      platforms
    };
    
    // In a real implementation, this would add to the database or blockchain
    // MOCK_CROSS_PLATFORM_PREDICTIONS.push(newPrediction);
    
    return Response.json({
      success: true,
      data: newPrediction,
      message: 'Cross-platform prediction created successfully'
    });
  } catch (error) {
    console.error('Error in sports-predictions POST API:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to create cross-platform prediction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}