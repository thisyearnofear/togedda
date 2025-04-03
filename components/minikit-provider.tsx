"use client"; // Required for Next.js

import { MiniKit } from "@worldcoin/minikit-js";
import { ReactNode, useEffect } from "react";

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      MiniKit.install();
      console.log(MiniKit.isInstalled());
    } catch (error) {
      console.error("Error installing MiniKit", error);
    }
  }, []);

  return <>{children}</>;
}
