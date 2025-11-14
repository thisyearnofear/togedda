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
      console.log("[NeynarSIWN] Neynar auth successful:", {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
      });
      onAuthSuccess(user);
    }
  }, [user, onAuthSuccess]);

  return (
    <div className={className}>
      <NeynarAuthButton variant="farcaster" />
    </div>
  );
}
