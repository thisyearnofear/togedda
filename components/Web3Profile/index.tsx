"use client";

import { useState } from "react";

interface Web3ProfileProps {
  address: string;
  className?: string;
  avatarOnly?: boolean;
}

export default function Web3Profile({
  address,
  className = "",
  avatarOnly = false,
}: Web3ProfileProps) {
  // Generate a random color based on the address
  const getAddressColor = () => {
    const hash = address.slice(2, 8);
    return `#${hash}`;
  };

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const addressInitials = address.slice(2, 4).toUpperCase();
  const addressColor = getAddressColor();

  // Avatar component
  const Avatar = () => (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs border border-white"
      style={{ backgroundColor: addressColor }}
    >
      {addressInitials}
    </div>
  );

  // If avatar only mode, just return the avatar
  if (avatarOnly) {
    return (
      <div className={`relative ${className}`}>
        <Avatar />
      </div>
    );
  }

  // Full profile display
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Avatar />
      <span className="text-sm font-medium truncate">{truncatedAddress}</span>
    </div>
  );
}
