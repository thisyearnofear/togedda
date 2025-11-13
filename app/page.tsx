import App from "@/components/App";
import { createMiniAppMetadata, MINIAPP_EMBEDS } from "@/lib/miniapp/metadata";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Togedda",
    openGraph: {
      title: "Togedda",
      description: "Track fitness goals across multiple blockchain networks",
    },
    other: createMiniAppMetadata(),
  };
}

export default function Home() {
  return <App />;
}
