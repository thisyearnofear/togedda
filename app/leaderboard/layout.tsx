import { Metadata } from "next";
import { env } from "@/lib/env";

const appUrl = env.NEXT_PUBLIC_URL;

export async function generateMetadata(): Promise<Metadata> {
  const frame = {
    version: "next",
    imageUrl: `${appUrl}/og.png`,
    button: {
      title: "View Leaderboard",
      action: {
        type: "launch_frame",
        name: "Imperfect Form",
        url: `${appUrl}/leaderboard`,
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#000000",
      },
    },
  };

  return {
    title: "Imperfect Form - Leaderboard",
    description: "Leaderboard for Imperfect Form fitness goals",
    openGraph: {
      title: "Imperfect Form - Leaderboard",
      description: "Leaderboard for Imperfect Form fitness goals",
      images: [{ url: `${appUrl}/og.png` }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
