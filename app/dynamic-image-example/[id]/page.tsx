import App from "@/components/Home";
import { env } from "@/lib/env";
import { Metadata } from "next";
import { createMiniAppMetadata } from "@/lib/miniapp/metadata";

const appUrl = env.NEXT_PUBLIC_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const imageUrl = new URL(`${appUrl}/api/og/example/${id}`);

  return {
    title: `Imperfect Form - Example ${id}`,
    description: `Dynamic example page ${id}`,
    openGraph: {
      title: `Imperfect Form - Example ${id}`,
      description: `Dynamic example page ${id}`,
      images: [{ url: imageUrl.toString() }],
    },
    other: createMiniAppMetadata({
      title: "Stay Hard",
      name: "Imperfect Form",
      url: appUrl,
      imageUrl: imageUrl.toString(),
    }),
  };
}

export default async function StreakFlex() {
  return <App />;
}
