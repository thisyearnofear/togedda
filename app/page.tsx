import App from "@/components/App";
import { env } from "@/lib/env";
import { Metadata } from "next";

const appUrl = env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/og.png`,
  buttons: [
    {
      title: "Track Fitness",
      action: {
        type: "launch_frame",
        name: "Imperfect Form",
        url: appUrl,
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#000000",
      },
    },
    {
      title: "View Leaderboard",
      action: {
        type: "post_redirect",
        url: `${appUrl}/leaderboard`,
      },
    },
    {
      title: "Prediction Market",
      action: {
        type: "post_redirect",
        url: `${appUrl}/predictions`,
      },
    },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Imperfect Form",
    openGraph: {
      title: "Imperfect Form",
      description: "Track fitness goals across multiple blockchain networks",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  return <App />;
}
