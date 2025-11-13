"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const Providers = dynamic(() => import("./providers"), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
