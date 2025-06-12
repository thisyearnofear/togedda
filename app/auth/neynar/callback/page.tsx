"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function NeynarCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!searchParams) {
          throw new Error("No search parameters available");
        }

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        // Exchange the code for user data
        const response = await fetch("/api/auth/neynar/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Authentication failed");
        }

        const userData = await response.json();

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "NEYNAR_AUTH_SUCCESS",
              user: userData.user,
            },
            window.location.origin
          );
        }

        setStatus("success");
        setMessage("Authentication successful! You can close this window.");

        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (error) {
        console.error("Neynar callback error:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Authentication failed";

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "NEYNAR_AUTH_ERROR",
              error: errorMessage,
            },
            window.location.origin
          );
        }

        setStatus("error");
        setMessage(errorMessage);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Completing Authentication
              </h2>
              <p className="text-gray-600">Please wait...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Success!
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
