import { Metadata } from "next";
import { createMiniAppMetadata, MINIAPP_EMBEDS } from "@/lib/miniapp/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Leaderboard - Imperfect Form",
    description: "View the fitness leaderboard and track your progress",
    openGraph: {
      title: "Leaderboard - Imperfect Form",
      description: "View the fitness leaderboard and track your progress",
    },
    other: createMiniAppMetadata({
      title: "View Leaderboard",
      name: "Imperfect Form - Leaderboard",
      url: `${process.env.NEXT_PUBLIC_URL}/leaderboard`,
    }),
  };
}

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
