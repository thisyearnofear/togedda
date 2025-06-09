"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        {/* Retro-style loading animation */}
        <div className="mb-8">
          <div className="inline-block">
            <div className="flex space-x-2">
              <div className="w-4 h-4 bg-white animate-pulse"></div>
              <div className="w-4 h-4 bg-white animate-pulse delay-75"></div>
              <div className="w-4 h-4 bg-white animate-pulse delay-150"></div>
            </div>
          </div>
        </div>

        {/* App Logo/Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 animate-pulse">
            IMPERFECT FORM
          </h1>
          <div className="flex justify-center space-x-2">
            <span className="h-4 w-4 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="h-4 w-4 rounded-full bg-green-500 animate-pulse delay-75"></span>
            <span className="h-4 w-4 rounded-full bg-purple-500 animate-pulse delay-150"></span>
            <span className="h-4 w-4 rounded-full bg-orange-500 animate-pulse delay-225"></span>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-sm text-gray-400">
          <p className="animate-pulse">Loading your fitness journey...</p>
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="w-48 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}