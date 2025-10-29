import { CriticalErrorBoundary } from "@/components/ErrorBoundary";
import Providers from "@/components/providers";
import WebAppInstallPrompt from "@/components/WebAppInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import EnvCheck from "@/components/EnvCheck";
import { appConfig } from "@/lib/config/app";
import { env } from "@/lib/env";
import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

// Enhanced metadata configuration
export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  keywords: [
    "fitness",
    "blockchain",
    "web3",
    "farcaster",
    "miniapp",
    "gamification",
    "health",
    "exercise",
    "crypto",
    "defi",
  ],
  authors: [{ name: "Imperfect Form Team" }],
  creator: "Imperfect Form",
  publisher: "Imperfect Form",

  // Open Graph metadata
  openGraph: {
    type: "website",
    locale: "en_US",
    url: env.NEXT_PUBLIC_URL,
    title: appConfig.name,
    description: appConfig.description,
    siteName: appConfig.name,
    images: [
      {
        url: `${env.NEXT_PUBLIC_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: appConfig.name,
        type: "image/png",
      },
    ],
  },

  // Twitter metadata
  twitter: {
    card: "summary_large_image",
    title: appConfig.name,
    description: appConfig.description,
    images: [`${env.NEXT_PUBLIC_URL}/og.png`],
    creator: "@imperfectform",
  },

  // App-specific metadata
  applicationName: appConfig.name,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",

  // Icons and manifest
  icons: {
    icon: [
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon-32x32.png",
  },
  manifest: "/manifest.json",

  // Verification and security
  verification: {
    // Add verification tokens if needed
    // google: "verification-token",
    // yandex: "verification-token",
  },

  // Robots and indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // PWA and other metadata
  other: {
    // Farcaster Frame Embed
    "fc:frame":
      '{"version":"next","imageUrl":"https://togedda.vercel.app/og.png","button":{"title":"Stay Hard","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://togedda.vercel.app","splashImageUrl":"https://togedda.vercel.app/splash.png","splashBackgroundColor":"#000000"}}}',

    // PWA related
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": appConfig.name,

    // Theme color
    "theme-color": "#000000",
    "msapplication-TileColor": "#000000",

    // Performance hints
    "dns-prefetch": "//fonts.googleapis.com",
    preconnect: "//fonts.gstatic.com",
  },
};

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Drop the RSC channel attribute before hydration */}
        <script
          id="remove-rsc-channel"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                if (typeof document !== 'undefined') {
                  if (document.documentElement) {
                    document.documentElement.removeAttribute('data-channel-name');
                  }
                  if (document.body) {
                    document.body.removeAttribute('data-channel-name');
                  }
                }
              })();
            `,
          }}
        />
        {/* Preload critical resources - Google Fonts handles font loading */}

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//api.neynar.com" />

        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="//fonts.gstatic.com" crossOrigin="" />

        {/* Additional security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

        {/* Farcaster Frame Embed - Single meta tag with JSON */}
        <meta
          name="fc:frame"
          content='{"version":"next","imageUrl":"https://togedda.vercel.app/og.png","button":{"title":"Stay Hard","action":{"type":"launch_frame","name":"Imperfect Form","url":"https://togedda.vercel.app","splashImageUrl":"https://togedda.vercel.app/splash.png","splashBackgroundColor":"#000000"}}}'
        />
      </head>

      <body
        className={`
          ${pressStart2P.className} 
          bg-black text-white 
          antialiased 
          overflow-x-hidden
          min-h-screen
        `}
      >
        <CriticalErrorBoundary>
          <Providers>
            {/* Skip to main content for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black p-2 rounded z-50"
            >
              Skip to main content
            </a>

            {/* Main content wrapper */}
            <div id="main-content" className="relative min-h-screen">
              {children}
            </div>

            {/* Web App Features */}
            <WebAppInstallPrompt />
            <OfflineIndicator />
            <EnvCheck />

            {/* Toast container for notifications */}
            <div id="toast-container" className="fixed top-4 right-4 z-50" />

            {/* Development tools */}
            {process.env.NODE_ENV === "development" && (
              <div className="fixed bottom-4 left-4 z-50">
                <div className="bg-yellow-500 text-black px-2 py-1 text-xs rounded">
                  DEV MODE
                </div>
              </div>
            )}
          </Providers>
        </CriticalErrorBoundary>

        {/* Wallet conflict handling script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Handle wallet extension conflicts early
              (function() {
                if (typeof window !== 'undefined') {
                  // Suppress Backpack override warnings
                  const originalConsoleWarn = console.warn;
                  console.warn = function(...args) {
                    const message = args.join(' ');
                    if (message.includes("Backpack couldn't override") ||
                        message.includes("window.ethereum") ||
                        message.includes("pageProvider.js")) {
                      return; // Suppress these warnings
                    }
                    originalConsoleWarn.apply(console, args);
                  };

                  // Handle wallet-related errors gracefully
                  window.addEventListener('error', function(event) {
                    if (event.error && event.error.message) {
                      const message = event.error.message.toLowerCase();
                      if (message.includes('wallet') ||
                          message.includes('ethereum') ||
                          message.includes('backpack')) {
                        event.preventDefault();
                        console.log('Wallet conflict handled:', event.error.message);
                      }
                    }
                  });
                }
              })();
            `,
          }}
        />

        {/* Service Worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && typeof window !== 'undefined') {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
