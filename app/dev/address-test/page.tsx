import { Metadata } from "next";
import AddressResolutionTest from "@/components/AddressResolutionTest";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Address Resolution Testing - Dev Tools",
  description: "Development tool for testing address resolution fallback chains",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddressTestPage() {
  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">🚫 Access Denied</h1>
          <p className="text-gray-400">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">🔧 Address Resolution Testing</h1>
            <div className="flex items-center space-x-3">
              <span className="px-2 py-1 bg-yellow-600 text-black text-xs rounded font-bold">
                DEV ONLY
              </span>
              <a
                href="/"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                ← Back to App
              </a>
            </div>
          </div>
          
          <p className="text-gray-400 max-w-2xl">
            Test the address resolution system with comprehensive fallback chains including 
            Farcaster, ENS, Web3.bio, and ENSData. Monitor cache performance and debug 
            resolution issues.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <h3 className="text-yellow-300 font-medium mb-1">Development Tool</h3>
              <p className="text-yellow-200 text-sm">
                This page makes real API calls to external services. Use responsibly and 
                be mindful of rate limits. Test results are logged to the browser console.
              </p>
            </div>
          </div>
        </div>

        {/* Main Testing Component */}
        <ComponentErrorBoundary>
          <AddressResolutionTest />
        </ComponentErrorBoundary>

        {/* Documentation */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold">📚 Resolution Chain Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Services */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-green-400">Primary Services</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-purple-400">Farcaster (Neynar):</strong>
                  <p className="text-gray-300 mt-1">
                    Resolves addresses to Farcaster usernames and profiles. 
                    Primary choice for Web3 social identity.
                  </p>
                </div>
                <div>
                  <strong className="text-blue-400">ENS (Viem):</strong>
                  <p className="text-gray-300 mt-1">
                    Direct ENS resolution using Ethereum mainnet. 
                    Most authoritative for .eth domains.
                  </p>
                </div>
              </div>
            </div>

            {/* Fallback Services */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-yellow-400">Fallback Services</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-cyan-400">Web3.bio:</strong>
                  <p className="text-gray-300 mt-1">
                    Aggregated Web3 identity data including ENS, Lens, 
                    Farcaster, and social profiles.
                  </p>
                </div>
                <div>
                  <strong className="text-orange-400">ENSData:</strong>
                  <p className="text-gray-300 mt-1">
                    Alternative ENS resolution service with additional 
                    metadata and social links.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Process */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-3">🔄 Resolution Process</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
                <span>Check local cache (5-minute TTL)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">2</span>
                <span>Try Farcaster resolution (if preferred)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs">3</span>
                <span>Try ENS resolution (if preferred)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs">4</span>
                <span>Fallback to Web3.bio (if enabled)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-xs">5</span>
                <span>Fallback to ENSData (if enabled)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">6</span>
                <span>Return shortened address (final fallback)</span>
              </div>
            </div>
          </div>

          {/* Environment Configuration */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-3">⚙️ Environment Configuration</h3>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-gray-400">ENABLE_WEB3BIO_FALLBACK:</span>{" "}
                <span className={process.env.ENABLE_WEB3BIO_FALLBACK !== "false" ? "text-green-400" : "text-red-400"}>
                  {process.env.ENABLE_WEB3BIO_FALLBACK !== "false" ? "enabled" : "disabled"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">ENABLE_ENSDATA_FALLBACK:</span>{" "}
                <span className={process.env.ENABLE_ENSDATA_FALLBACK !== "false" ? "text-green-400" : "text-red-400"}>
                  {process.env.ENABLE_ENSDATA_FALLBACK !== "false" ? "enabled" : "disabled"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">WEB3_BIO_API_KEY:</span>{" "}
                <span className={process.env.WEB3_BIO_API_KEY ? "text-green-400" : "text-yellow-400"}>
                  {process.env.WEB3_BIO_API_KEY ? "configured" : "not configured (using free tier)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-700 text-center text-gray-500 text-xs">
          <p>
            Address Resolution Testing Tool - Development Environment Only
          </p>
          <p className="mt-1">
            Check browser console for detailed logs and API responses
          </p>
        </div>
      </div>
    </div>
  );
}