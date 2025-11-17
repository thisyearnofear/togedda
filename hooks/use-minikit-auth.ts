"use client";

import { MESSAGE_EXPIRATION_TIME } from "@/lib/constants";
import { NeynarUser } from "@/lib/neynar";
import { useAuthenticate, useMiniKit } from "@coinbase/onchainkit/minikit";
// Simple replacement for MiniApp context - just return initialized state
const useMiniApp = () => ({ isInitialized: true });
import { useCallback, useEffect, useState } from "react";

/**
 * MiniKit-specific authentication hook
 * Only for components that specifically need MiniKit functionality
 * Most components should use useUnifiedAuth instead
 */
export const useMiniKitAuth = ({ autoSignIn = false }: { autoSignIn?: boolean }) => {
  const { context } = useMiniKit();
  const { isInitialized } = useMiniApp();
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldSignIn, setShouldSignIn] = useState(autoSignIn);
  const [signInAttempts, setSignInAttempts] = useState(0);

  // Check if we already have a valid session (only once when initialized)
  useEffect(() => {
    const checkSession = async () => {
      if (isSignedIn || !isInitialized || !context?.user?.fid) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch("/api/test", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          console.log("Valid MiniKit session detected");
          setIsSignedIn(true);

          // Fetch user data
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
        } else {
          console.log("No valid session found, status:", res.status);
          // In mini app context, if we have context but no session,
          // we should still try to get user data directly
          if (context?.user?.fid) {
            console.log("Attempting to fetch user data directly from context");
            try {
              const userRes = await fetch(`/api/farcaster/user?fid=${context.user.fid}`, {
                credentials: "include",
                signal: controller.signal,
              });

              if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.users && userData.users.length > 0) {
                  setUser(userData.users[0]);
                  setIsSignedIn(true);
                  console.log("Successfully fetched user data from context");
                } else {
                  console.log("No user data found, using context data as fallback");
                  setUser({
                    fid: context.user.fid.toString(),
                    username: context.user.username || "Unknown User",
                    display_name: context.user.displayName || "Connected User",
                    pfp_url: context.user.pfpUrl || "",
                    verifications: [],
                    custody_address: ""
                  });
                  setIsSignedIn(true);
                }
              }
            } catch (userError) {
              console.error("Error fetching user data from context:", userError);
              console.log("Using context data as fallback due to fetch error");
              setUser({
                fid: context.user.fid.toString(),
                username: context.user.username || "Unknown User",
                display_name: context.user.displayName || "Connected User",
                pfp_url: context.user.pfpUrl || "",
                verifications: [],
                custody_address: ""
              });
              setIsSignedIn(true);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn("MiniKit session check timed out");
          if (context?.user?.fid) {
            console.log("Session check timed out, using context data as fallback");
            setUser({
              fid: context.user.fid.toString(),
              username: context.user.username || "Unknown User",
              display_name: context.user.displayName || "Connected User",
              pfp_url: context.user.pfpUrl || "",
              verifications: [],
              custody_address: ""
            });
            setIsSignedIn(true);
          }
        } else {
          console.error("Error checking MiniKit session:", err);
          if (context?.user?.fid) {
            console.log("Session check error, using context data as fallback");
            setUser({
              fid: context.user.fid.toString(),
              username: context.user.username || "Unknown User",
              display_name: context.user.displayName || "Connected User",
              pfp_url: context.user.pfpUrl || "",
              verifications: [],
              custody_address: ""
            });
            setIsSignedIn(true);
          }
        }
      }
    };

    // Only check once when initialized and context is available
    if (isInitialized && context?.user?.fid && !isSignedIn) {
      const timeoutId = setTimeout(checkSession, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, context?.user?.fid, context?.user, isSignedIn]); // Include full user context in deps

  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!context) {
        console.log("MiniKit context not available yet");
        return null;
      }

      console.log("Starting MiniKit sign-in with FID:", context.user.fid);

      const result = await signIn({
        nonce: Math.random().toString(36).substring(2),
        notBefore: new Date().toISOString(),
        expirationTime: new Date(
          Date.now() + MESSAGE_EXPIRATION_TIME
        ).toISOString(),
      });

      if (!result) {
        throw new Error("MiniKit sign in failed - no result");
      }

      const referrerFid =
        context.location?.type === "cast_embed"
          ? context.location.cast.author.fid
          : null;

      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          signature: result?.signature || '',
          message: result?.message || '',
          fid: context.user.fid,
          referrerFid,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "MiniKit sign in failed");
      }

      const data = await res.json();
      setUser(data.user);
      setIsSignedIn(true);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "MiniKit sign in failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [context, signIn]);

  // Auto sign-in logic
  useEffect(() => {
    const attemptSignIn = async () => {
      if (shouldSignIn && isInitialized && !isSignedIn && signInAttempts < 2) {
        if (context) {
          try {
            await handleSignIn();
          } catch (err) {
            setSignInAttempts(prev => prev + 1);
            if (signInAttempts < 1) {
              setTimeout(() => setShouldSignIn(true), 5000);
            } else {
              setError("Auto sign-in failed. Please try manually.");
            }
          }
        } else {
          if (signInAttempts > 1) {
            setError("MiniKit context not available.");
            return;
          }
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

  return { 
    signIn: handleSignIn, 
    isSignedIn, 
    isLoading, 
    error, 
    user 
  };
};
