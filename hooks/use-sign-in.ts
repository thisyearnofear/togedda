import { MESSAGE_EXPIRATION_TIME } from "@/lib/constants";
import { NeynarUser } from "@/lib/neynar";
import { useAuthenticate, useMiniKit } from "@coinbase/onchainkit/minikit";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useCallback, useEffect, useState } from "react";

export const useSignIn = ({ autoSignIn = false }: { autoSignIn?: boolean }) => {
  const { context } = useMiniKit();
  const { isInitialized } = useMiniApp();
  // this method allows for Sign in with Farcaster (SIWF)
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldSignIn, setShouldSignIn] = useState(autoSignIn);
  const [signInAttempts, setSignInAttempts] = useState(0);

  // Check if we already have a valid session
  useEffect(() => {
    const checkSession = async () => {
      if (isSignedIn || !isInitialized) return;

      try {
        // Try to fetch user data from a test endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const res = await fetch("/api/test", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          // We have a valid session
          console.log("Valid session detected");
          setIsSignedIn(true);

          // Try to get user data
          if (context?.user?.fid) {
            const userRes = await fetch(`/api/farcaster/user?fid=${context.user.fid}`, {
              credentials: "include",
              signal: controller.signal,
            });

            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.users && userData.users.length > 0) {
                setUser(userData.users[0]);
              }
            }
          }
        } else {
          console.log("No valid session, will need to sign in");
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn("Session check timed out");
        } else {
          console.error("Error checking session:", err);
        }
      }
    };

    // Only check session if we have context or after a delay
    const timeoutId = setTimeout(checkSession, 1000);
    return () => clearTimeout(timeoutId);
  }, [isInitialized, isSignedIn, context]);

  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For web app context, add timeout and better error handling
      const isWebAppContext = typeof window !== "undefined" && window.parent === window;
      const timeoutDuration = isWebAppContext ? 8000 : 15000; // Shorter timeout for web app

      if (!context) {
        console.log("Context not available yet, waiting...");
        // Don't immediately throw error for web app context, allow retry
        return null;
      }

      console.log("Starting sign-in process with FID:", context.user.fid);

      let referrerFid: number | null = null;
      
      // Add timeout wrapper for sign-in
      const signInPromise = signIn({
        nonce: Math.random().toString(36).substring(2),
        notBefore: new Date().toISOString(),
        expirationTime: new Date(
          Date.now() + MESSAGE_EXPIRATION_TIME
        ).toISOString(),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(
            "Sign-in is taking longer than expected. Please try again."
          ));
        }, timeoutDuration);
      });

      const result = await Promise.race([signInPromise, timeoutPromise]);

      if (!result) {
        throw new Error("Sign in failed - no result from signIn()");
      }

      console.log("Got signature from Farcaster", {
        messageLength: result?.message?.length || 0,
        signatureLength: result?.signature?.length || 0
      });

      referrerFid =
        context.location?.type === "cast_embed"
          ? context.location.cast.fid
          : null;

      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({
          signature: result?.signature || '',
          message: result?.message || '',
          fid: context.user.fid,
          referrerFid,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Sign-in API error:", errorData);
        throw new Error(errorData.error || "Sign in failed");
      }

      const data = await res.json();
      console.log("Sign-in successful:", data);
      setUser(data.user);
      setIsSignedIn(true);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Sign in failed";
      console.error("Sign-in error:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [context, signIn]);

  // Wait for initialization and context before attempting sign-in
  useEffect(() => {
    const attemptSignIn = async () => {
      if (shouldSignIn && isInitialized && !isSignedIn && signInAttempts < 2) { // Reduced max attempts
        if (context) {
          try {
            console.log("Attempting sign-in, attempt #", signInAttempts + 1);
            await handleSignIn();
          } catch (err) {
            console.error("Sign-in attempt failed:", err);
            // Increment attempt counter
            setSignInAttempts(prev => prev + 1);

            // Only retry once and with longer delay
            if (signInAttempts < 1) {
              setTimeout(() => {
                setShouldSignIn(true);
              }, 5000);
            } else {
              // After failed attempts, suggest alternative
              setError("Auto sign-in failed. Please try manually or connect a wallet.");
            }
          }
        } else {
          // For web app context, don't keep retrying indefinitely
          const isWebAppContext = typeof window !== "undefined" && window.parent === window;
          if (signInAttempts > 1) {
            console.log("Multiple sign-in attempts failed, stopping");
            setError(isWebAppContext 
              ? "Farcaster sign-in not available. You can still connect a wallet for basic access."
              : "Farcaster context not available. Please try again."
            );
            return;
          }
          
          console.log("No context available yet, will retry");
          setTimeout(() => {
            if (!isSignedIn) {
              setShouldSignIn(true);
            }
          }, 2000);
        }
        setShouldSignIn(false);
      }
    };

    attemptSignIn();
  }, [shouldSignIn, isInitialized, context, handleSignIn, isSignedIn, signInAttempts]);

  return { signIn: handleSignIn, isSignedIn, isLoading, error, user };
};
