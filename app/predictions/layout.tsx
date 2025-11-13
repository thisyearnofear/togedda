import { Metadata } from "next";
import { env } from "@/lib/env";

const appUrl = env.NEXT_PUBLIC_URL;

export async function generateMetadata(): Promise<Metadata> {
  const frame = {
    version: "next",
    imageUrl: `${appUrl}/og.png`,
    button: {
      title: "Prediction Market",
      action: {
        type: "launch_frame",
        name: "Togedda",
        url: `${appUrl}/predictions`,
        splashImageUrl: `${appUrl}/splash.png`,
        splashBackgroundColor: "#000000",
      },
    },
  };

  return {
    title: "Togedda - Prediction Market",
    description: "Prediction market for Togedda fitness goals",
    openGraph: {
      title: "Togedda - Prediction Market",
      description: "Prediction market for Togedda fitness goals",
      images: [{ url: `${appUrl}/og.png` }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
