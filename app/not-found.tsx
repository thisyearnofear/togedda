/**
 * 404 Not Found Page
 * Retro gaming themed error page for Imperfect Form
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* ASCII Art Style 404 */}
        <div className="font-mono text-sm mb-8 text-green-300">
          <pre className="whitespace-pre-wrap">
            {`
 ██╗  ██╗ ██████╗ ██╗  ██╗
 ██║  ██║██╔═████╗██║  ██║
 ███████║██║██╔██║███████║
 ╚════██║████╔╝██║╚════██║
      ██║╚██████╔╝     ██║
      ╚═╝ ╚═════╝      ╚═╝
`}
          </pre>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold mb-4 text-green-400 font-mono">
          PAGE NOT FOUND
        </h1>

        <div className="text-lg mb-8 text-green-300 font-mono">
          <p className="mb-2">
            ERROR: Route does not exist in the fitness matrix
          </p>
          <p className="text-sm opacity-75">
            The page you&apos;re looking for has been lost in the digital void
          </p>
        </div>

        {/* Navigation Options */}
        <div className="space-y-4 mb-8">
          <Link
            href="/"
            className="block bg-green-900 hover:bg-green-800 text-green-100 px-6 py-3 rounded border-2 border-green-400 font-mono transition-colors duration-200"
          >
            → RETURN TO HOME BASE
          </Link>

          <Link
            href="/predictions"
            className="block bg-purple-900 hover:bg-purple-800 text-purple-100 px-6 py-3 rounded border-2 border-purple-400 font-mono transition-colors duration-200"
          >
            → ACCESS PREDICTION MARKETS
          </Link>

          <Link
            href="/leaderboard"
            className="block bg-blue-900 hover:bg-blue-800 text-blue-100 px-6 py-3 rounded border-2 border-blue-400 font-mono transition-colors duration-200"
          >
            → VIEW LEADERBOARD
          </Link>
        </div>

        {/* Motivational Message */}
        <div className="text-center text-green-300 font-mono text-sm">
          <p className="mb-2">🔥 CARRY THE BOATS! 🚣🌊</p>
          <p className="opacity-75">
            Even 404 errors can&apos;t stop your fitness journey
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-xs text-green-600 font-mono">
          <p>Imperfect Form - Where Fitness Meets Finance</p>
          <p className="mt-1">Powered by Base • XMTP • AI</p>
        </div>
      </div>
    </div>
  );
}
