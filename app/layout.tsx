import Providers from "@/components/providers";
import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Imperfect Form",
  description:
    "Track fitness goals across multiple blockchain networks with a retro-gamified style",
  openGraph: {
    title: "Imperfect Form",
    description:
      "Track fitness goals across blockchain networks with a retro-gamified style",
    images: [
      {
        url: "https://imperfectminiapp.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "Imperfect Form",
      },
    ],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://imperfectminiapp.vercel.app/og.png",
      button: {
        title: "Stay Hard",
        action: {
          type: "launch_frame",
          url: "https://imperfectminiapp.vercel.app",
          name: "Imperfect Form",
          splashImageUrl: "https://imperfectminiapp.vercel.app/splash.png",
          splashBackgroundColor: "#000000",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={pressStart2P.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
