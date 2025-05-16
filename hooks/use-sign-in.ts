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
        // Try to fetch user data from a test endpoint
        const res = await fetch("/api/test", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          // We have a valid session
          console.log("Valid session detected");
          setIsSignedIn(true);

          // Try to get user data
          if (context?.user?.fid) {
            const userRes = await fetch(`/api/farcaster/user?fid=${context.user.fid}`, {
              credentials: "include",
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
        console.error("Error checking session:", err);
      }
    };

    checkSession();
  }, [isInitialized, isSignedIn, context]);

  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!context) {
        console.log("Context not available yet, waiting...");
        return null;
      }

      console.log("Starting sign-in process with FID:", context.user.fid);

      let referrerFid: number | null = null;
      const result = await signIn({
        nonce: Math.random().toString(36).substring(2),
        notBefore: new Date().toISOString(),
        expirationTime: new Date(
          Date.now() + MESSAGE_EXPIRATION_TIME
        ).toISOString(),
      });

      if (!result) {
        throw new Error("Sign in failed - no result from signIn()");
      }

      console.log("Got signature from Farcaster", {
        messageLength: result.message.length,
        signatureLength: result.signature.length
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
          signature: result.signature,
          message: result.message,
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
      if (shouldSignIn && isInitialized && !isSignedIn && signInAttempts < 3) {
        if (context) {
          try {
            console.log("Attempting sign-in, attempt #", signInAttempts + 1);
            await handleSignIn();
          } catch (err) {
            console.error("Sign-in attempt failed:", err);
            // Increment attempt counter
            setSignInAttempts(prev => prev + 1);

            // Try again after a delay if we haven't exceeded max attempts
            if (signInAttempts < 2) {
              setTimeout(() => {
                setShouldSignIn(true);
              }, 3000);
            }
          }
        } else {
          // If no context but we're initialized, set a timeout to try again
          console.log("No context available yet, will retry");
          setTimeout(() => {
            if (!isSignedIn) {
              setShouldSignIn(true);
            }
          }, 3000);
        }
        setShouldSignIn(false);
      }
    };

    attemptSignIn();
  }, [shouldSignIn, isInitialized, context, handleSignIn, isSignedIn, signInAttempts]);

  return { signIn: handleSignIn, isSignedIn, isLoading, error, user };
};
