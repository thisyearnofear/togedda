"use client";

import React from "react";
import { NeynarAuthButton, useNeynarContext } from "@neynar/react";

interface NeynarSIWNProps {
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: string) => void;
  className?: string;
}

export default function NeynarSIWN({
  onAuthSuccess,
  onAuthError,
  className = "",
}: NeynarSIWNProps) {
  const { user } = useNeynarContext();

  // Handle auth success when user changes
  React.useEffect(() => {
    if (user && onAuthSuccess) {
      console.log("Neynar auth successful:", user);
      onAuthSuccess(user);
    }
  }, [user, onAuthSuccess]);

  return (
    <div className={className}>
      <NeynarAuthButton />
      {user && (
        <div className="mt-2 text-xs text-green-400 text-center">
          ✅ Signed in as @{user.username}
        </div>
      )}
    </div>
  );
}
