"use client";

import { useEffect, useState } from "react";

export default function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<any>({});

  useEffect(() => {
    // Check required environment variables
    const requiredEnvs = {
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
      NEXT_PUBLIC_MINIKIT_PROJECT_ID: process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID,
      NEXT_PUBLIC_FARCASTER_HEADER: process.env.NEXT_PUBLIC_FARCASTER_HEADER,
      NEXT_PUBLIC_FARCASTER_PAYLOAD: process.env.NEXT_PUBLIC_FARCASTER_PAYLOAD,
      NEXT_PUBLIC_FARCASTER_SIGNATURE: process.env.NEXT_PUBLIC_FARCASTER_SIGNATURE,
    };

    const optionalEnvs = {
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE,
    };

    setEnvStatus({
      required: requiredEnvs,
      optional: optionalEnvs,
      missing: Object.entries(requiredEnvs).filter(([key, value]) => !value).map(([key]) => key),
    });
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <details className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-xs">
        <summary className="cursor-pointer text-gray-300 font-medium">
          🔧 Environment Status
        </summary>
        
        <div className="mt-3 space-y-2">
          {/* Required Environment Variables */}
          <div>
            <h4 className="text-green-400 font-medium mb-1">Required:</h4>
            {Object.entries(envStatus.required || {}).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={value ? "text-green-400" : "text-red-400"}>
                  {value ? "✓" : "✗"}
                </span>
                <span className="text-gray-300">{key}</span>
              </div>
            ))}
          </div>

          {/* Optional Environment Variables */}
          <div>
            <h4 className="text-blue-400 font-medium mb-1">Optional:</h4>
            {Object.entries(envStatus.optional || {}).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={value ? "text-green-400" : "text-gray-500"}>
                  {value ? "✓" : "○"}
                </span>
                <span className="text-gray-300">{key}</span>
              </div>
            ))}
          </div>

          {/* Missing Variables Warning */}
          {envStatus.missing?.length > 0 && (
            <div className="bg-red-900/20 border border-red-600 rounded p-2">
              <h4 className="text-red-400 font-medium mb-1">Missing Required:</h4>
              {envStatus.missing.map((key: string) => (
                <div key={key} className="text-red-300 text-xs">• {key}</div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
