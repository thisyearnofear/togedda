"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useCrossPlatformPredictions } from '@/hooks/use-prediction-queries';
import CrossPlatformPredictionCard from '@/components/PredictionMarket/CrossPlatformPredictionCard';
import { ChainPrediction } from '@/lib/dual-chain-service';

// Define types for sports data
interface SportsData {
  pushups?: number;
  squats?: number;
  pullups?: number;
  jumps?: number;
  situps?: number;
  users?: string[];
}

interface CrossPlatformData {
  imperfectform: SportsData;
  imperfectcoach: SportsData;
  imperfectabs: SportsData;
  totals: {
    pushups: number;
    squats: number;
    pullups: number;
    jumps: number;
    situps: number;
    totalExercises: number;
  };
}

const SportsCentralPage = () => {
  const { address, isConnected } = useAccount();
  const [sportsData, setSportsData] = useState<CrossPlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get cross-platform predictions using the dedicated hook
  const {
    data: crossPlatformPredictions = [],
    isLoading: predictionsLoading,
    error: predictionsError,
  } = useCrossPlatformPredictions();

  useEffect(() => {
    const fetchSportsData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sports-central');
        const result = await response.json();
        
        if (result.success) {
          setSportsData(result.data);
        } else {
          setError(result.error || 'Failed to fetch sports data');
        }
      } catch (err) {
        setError('Network error while fetching sports data');
        console.error('Error fetching sports data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSportsData();
  }, []);

  // Calculate total from all platforms
  const totalExercises = sportsData?.totals.totalExercises || 0;

  if (loading) {
    return (
      <div className="retro-arcade min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="game-container py-8 text-center">
            <div className="text-xl mb-4">Loading Sports Central...</div>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="retro-arcade min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="game-container py-8 text-center bg-red-900/20 border border-red-600">
            <div className="text-red-300 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="retro-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-arcade min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="game-container py-3 px-4 mb-4 bg-black relative">
            <h1 
              className="text-xl md:text-2xl mb-2 pulse-animation"
              style={{ textShadow: "2px 2px 0px #000" }}
            >
              🏆 SPORTS CENTRAL
            </h1>
            <div className="text-sm text-gray-400">
              Predictions powered by multiple sports platforms
            </div>
          </div>
        </header>

        {/* Stats Overview */}
        <section className="mb-8">
          <div className="game-container p-4 mb-4">
            <h2 className="text-lg font-bold mb-4 text-center">📊 Platform Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* ImperfectForm Card */}
              <div className="bg-gray-900 p-4 rounded-lg border border-purple-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-purple-400">💪 ImperfectForm</h3>
                  <span className="text-purple-400">🟣</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pushups:</span>
                    <span className="font-mono">{sportsData?.imperfectform.pushups || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Squats:</span>
                    <span className="font-mono">{sportsData?.imperfectform.squats || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className="font-mono">{sportsData?.imperfectform.users?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* ImperfectCoach Card */}
              <div className="bg-gray-900 p-4 rounded-lg border border-green-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-green-400">🏋️ ImperfectCoach</h3>
                  <span className="text-green-400">🟢</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pullups:</span>
                    <span className="font-mono">{sportsData?.imperfectcoach.pullups || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumps:</span>
                    <span className="font-mono">{sportsData?.imperfectcoach.jumps || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className="font-mono">{sportsData?.imperfectcoach.users?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* ImperfectAbs Card */}
              <div className="bg-gray-900 p-4 rounded-lg border border-yellow-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-yellow-400">🏃 ImperfectAbs</h3>
                  <span className="text-yellow-400">🟡</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Situps:</span>
                    <span className="font-mono">{sportsData?.imperfectabs.situps || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className="font-mono">{sportsData?.imperfectabs.users?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-purple-900/50 to-green-900/50 to-yellow-900/50 p-4 rounded-lg border-2 border-white text-center">
              <h3 className="text-lg font-bold mb-2">🏆 Total Exercises Across All Platforms</h3>
              <div className="text-3xl font-bold text-white">{totalExercises.toLocaleString()}</div>
              <div className="text-sm text-gray-300 mt-1">combined from all three platforms</div>
            </div>
          </div>
        </section>

        {/* Cross-Platform Predictions */}
        <section className="mb-8">
          <div className="game-container p-4">
            <h2 className="text-lg font-bold mb-4 text-center">🔮 Cross-Platform Predictions</h2>
            
            {predictionsLoading ? (
              <div className="text-center py-8">
                <div className="loading-spinner"></div>
                <div className="mt-4 text-gray-400">Loading predictions...</div>
              </div>
            ) : crossPlatformPredictions.length > 0 ? (
              <div className="space-y-4">
                {crossPlatformPredictions.map((prediction: any) => (
                  <div 
                    key={`${prediction.id}`} 
                    className="bg-black border border-gray-800 rounded-lg p-3"
                  >
                    <CrossPlatformPredictionCard
                      prediction={prediction}
                      onVote={async (predictionId, isYes, amount) => console.log('Vote functionality would go here', { predictionId, isYes, amount })}
                      simplified={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-bold mb-2">No Multi-Sports Predictions</h3>
                <p>Join predictions spanning multiple sports platforms</p>
              </div>
            )}
          </div>
        </section>

        {/* Platform Interactions */}
        <section>
          <div className="game-container p-4">
            <h2 className="text-lg font-bold mb-4 text-center">🔗 Connect Platforms</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="retro-button bg-purple-700 hover:bg-purple-600 py-3">
                <div className="text-xl mb-1">💪</div>
                <div>Connect ImperfectForm</div>
              </button>
              <button className="retro-button bg-green-700 hover:bg-green-600 py-3">
                <div className="text-xl mb-1">🏋️</div>
                <div>Connect ImperfectCoach</div>
              </button>
              <button className="retro-button bg-yellow-700 hover:bg-yellow-600 py-3">
                <div className="text-xl mb-1">🏃</div>
                <div>Connect ImperfectAbs</div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SportsCentralPage;