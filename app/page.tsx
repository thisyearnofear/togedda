import App from "@/components/App";
import { createMiniAppMetadata, MINIAPP_EMBEDS } from "@/lib/miniapp/metadata";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Imperfect Form",
    openGraph: {
      title: "Imperfect Form",
      description: "Track fitness goals across multiple blockchain networks",
    },
    other: createMiniAppMetadata(),
  };
}

export default function Home() {
  return <App />;
}
