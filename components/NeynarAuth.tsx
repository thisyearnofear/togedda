"use client";

import { useState, useCallback } from "react";
import { env } from "@/lib/env";

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
  signer_uuid?: string;
}

interface NeynarAuthProps {
  onAuthSuccess?: (user: NeynarUser) => void;
  onAuthError?: (error: string) => void;
  className?: string;
}

export default function NeynarAuth({
  onAuthSuccess,
  onAuthError,
  className = "",
}: NeynarAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNeynarAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(
        "Starting Neynar authentication with client ID:",
        env.NEXT_PUBLIC_NEYNAR_CLIENT_ID
      );

      // Create a popup window for Neynar authentication
      const authUrl = `https://app.neynar.com/login?client_id=${
        env.NEXT_PUBLIC_NEYNAR_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        `${env.NEXT_PUBLIC_URL}/auth/neynar/callback`
      )}&response_type=code&scope=read_write`;

      const popup = window.open(
        authUrl,
        "neynar-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for the popup to close or receive a message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          setError("Authentication cancelled");
        }
      }, 1000);

      // Listen for messages from the popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "NEYNAR_AUTH_SUCCESS") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageListener);

          const user = event.data.user as NeynarUser;
          onAuthSuccess?.(user);
          setIsLoading(false);
        } else if (event.data.type === "NEYNAR_AUTH_ERROR") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageListener);

          const errorMessage = event.data.error || "Authentication failed";
          setError(errorMessage);
          onAuthError?.(errorMessage);
          setIsLoading(false);
        }
      };

      window.addEventListener("message", messageListener);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      setError(message);
      onAuthError?.(message);
      setIsLoading(false);
    }
  }, [onAuthSuccess, onAuthError]);

  return (
    <div className={className}>
      <button
        onClick={handleNeynarAuth}
        disabled={isLoading}
        className="
          flex items-center justify-center gap-2 px-6 py-3 w-full
          bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400
          text-white font-medium rounded-lg transition-colors
        "
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>🟣 Sign in with Farcaster</>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-1 text-center">{error}</p>
      )}
    </div>
  );
}
