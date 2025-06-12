"use client";

import React, { useState, useEffect } from "react";
import { FaRobot, FaCircle } from "react-icons/fa";

interface ChatButtonProps {
  onOpenChat: () => void;
  className?: string;
}

interface BotStatus {
  online: boolean;
  address: string;
  environment: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ onOpenChat, className = "" }) => {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Lazy load bot status check - only when component mounts
    const checkBotStatus = async () => {
      try {
        // Dynamic import to avoid loading XMTP code until needed
        const { getBotStatus } = await import('./XMTPIntegration');
        const status = await getBotStatus();
        setBotStatus(status);
      } catch (error) {
        console.error('Failed to check bot status:', error);
        setBotStatus({ online: false, address: 'Unknown', environment: 'Unknown' });
      } finally {
        setIsLoading(false);
      }
    };

    // Only check status when user is likely to interact
    const timer = setTimeout(checkBotStatus, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    // Track engagement
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('chat_button_clicked', {
        bot_online: botStatus?.online,
        context: 'prediction_market'
      });
    }
    onOpenChat();
  };

  return (
    <div className={`bg-purple-900 bg-opacity-20 border border-purple-800 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center mr-3 shadow-lg">
            <FaRobot className="text-xl text-white" />
          </div>
          <div>
            <h3 className="text-md font-bold text-purple-400 mb-1">
              AI Prediction Assistant
            </h3>
            <p className="text-sm text-gray-300">
              Chat to create custom predictions
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button 
            className="retro-button text-sm px-4 py-2 mb-2 min-h-[44px] touch-manipulation hover:scale-105 transition-transform"
            onClick={handleClick}
          >
            Start Chat
          </button>
          <div className="flex items-center text-xs">
            {isLoading ? (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-400 mr-1 animate-pulse"></div>
                <span className="text-yellow-400">Checking...</span>
              </>
            ) : botStatus?.online ? (
              <>
                <FaCircle className="w-2 h-2 text-green-400 mr-1" />
                <span className="text-green-400">Online</span>
              </>
            ) : (
              <>
                <FaCircle className="w-2 h-2 text-red-400 mr-1" />
                <span className="text-red-400">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick start suggestions */}
      <div className="mt-3 pt-3 border-t border-purple-800 border-opacity-50">
        <p className="text-xs text-gray-400 mb-2">Quick start:</p>
        <div className="flex flex-wrap gap-1">
          {[
            "Bitcoin $100k prediction",
            "Fitness challenge",
            "Custom idea"
          ].map((suggestion, index) => (
            <button
              key={index}
              className="text-xs bg-purple-800 bg-opacity-30 text-purple-300 px-2 py-1 rounded hover:bg-opacity-50 transition-colors"
              onClick={() => {
                handleClick();
                // Could pre-fill chat with suggestion
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatButton;
