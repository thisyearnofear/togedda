"use client";

import { useState, useEffect } from "react";
import { resolveAddress, resolveAddressBatch, getCacheStats, clearAddressCache, getProfileInfo } from "@/lib/utils/address-display";
import AddressDisplay from "@/components/AddressDisplay";
import { isAddress } from "viem";

interface TestResult {
  address: string;
  result: any;
  duration: number;
  error?: string;
  source?: string;
}

interface BatchTestResult {
  addresses: string[];
  results: TestResult[];
  totalDuration: number;
  successCount: number;
  failureCount: number;
}

export default function AddressResolutionTest() {
  const [testAddress, setTestAddress] = useState("0x825794f3792e81951fe55b7f527eab7e8063d2cc");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [batchResults, setBatchResults] = useState<BatchTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Test addresses for batch testing
  const testAddresses = [
    "0x825794f3792e81951fe55b7f527eab7e8063d2cc", // Sample address
    "0x55a5705453ee82c742274154136fce8149597058", // Sample address
    "0xd865cd7ccc91f83692ab330981c3e3e9d7a0526a", // Sample address
    "0x8393c8fe63775b70976b2efd3923e990c0d01dbd", // Sample address
    "0x1e17b4fb12b29045b29475f74e536db97ddc5d40", // Sample address
  ];

  // Update cache stats
  const updateCacheStats = () => {
    setCacheStats(getCacheStats());
  };

  useEffect(() => {
    updateCacheStats();
    const interval = setInterval(updateCacheStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const testSingleAddress = async (address: string) => {
    if (!isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await resolveAddress(address, { enableFallbacks: true });
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        address,
        result,
        duration,
        source: result.source,
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      updateCacheStats();
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        address,
        result: null,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const testBatchAddresses = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const results = await resolveAddressBatch(testAddresses, { enableFallbacks: true });
      const totalDuration = Date.now() - startTime;

      const testResults: TestResult[] = results.map((result, index) => ({
        address: testAddresses[index],
        result,
        duration: totalDuration / results.length, // Average duration
        source: result.source,
      }));

      const batchResult: BatchTestResult = {
        addresses: testAddresses,
        results: testResults,
        totalDuration,
        successCount: testResults.filter(r => r.result && r.result.type !== "shortened" && r.result.type !== "full").length,
        failureCount: testResults.filter(r => !r.result || r.result.type === "shortened" || r.result.type === "full").length,
      };

      setBatchResults(batchResult);
      updateCacheStats();
    } catch (error) {
      console.error("Batch test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAPIEndpoints = async () => {
    setIsLoading(true);
    const testAddr = testAddress;

    const endpoints = [
      { name: "ENS (Viem)", url: `/api/ens/resolve?address=${testAddr}` },
      { name: "Web3.bio", url: `/api/web3bio/resolve?address=${testAddr}` },
      { name: "ENSData", url: `/api/ensdata/resolve?address=${testAddr}` },
      { name: "Farcaster", url: `/api/farcaster/address-to-fid?address=${testAddr}` },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const startTime = Date.now();
        try {
          const response = await fetch(endpoint.url);
          const data = await response.json();
          const duration = Date.now() - startTime;
          
          return {
            name: endpoint.name,
            success: response.ok,
            data,
            duration,
            status: response.status,
          };
        } catch (error) {
          return {
            name: endpoint.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Date.now() - startTime,
          };
        }
      })
    );

    console.log("API Endpoint Test Results:", results);
    setIsLoading(false);
  };

  const clearCache = () => {
    clearAddressCache();
    updateCacheStats();
    alert("Cache cleared successfully");
  };

  return (
    <div className="space-y-6 p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Address Resolution Testing</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced
        </button>
      </div>

      {/* Cache Stats */}
      <div className="bg-gray-800 p-3 rounded">
        <h3 className="font-medium mb-2">Cache Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Address:</span> {cacheStats.addressCache || 0}
          </div>
          <div>
            <span className="text-gray-400">ENS:</span> {cacheStats.ensCache || 0}
          </div>
          <div>
            <span className="text-gray-400">Farcaster:</span> {cacheStats.farcasterCache || 0}
          </div>
          <div>
            <span className="text-gray-400">Web3.bio:</span> {cacheStats.web3bioCache || 0}
          </div>
          <div>
            <span className="text-gray-400">ENSData:</span> {cacheStats.ensdataCache || 0}
          </div>
        </div>
        <div className="mt-2">
          <span className="text-gray-400">Total Cached:</span> {cacheStats.totalCached || 0}
          <button
            onClick={clearCache}
            className="ml-4 text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-600 rounded"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Single Address Test */}
      <div className="space-y-3">
        <h3 className="font-medium">Single Address Test</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            placeholder="Enter Ethereum address..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm"
          />
          <button
            onClick={() => testSingleAddress(testAddress)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm"
          >
            {isLoading ? "Testing..." : "Test"}
          </button>
        </div>
      </div>

      {/* Batch Test */}
      <div className="space-y-3">
        <h3 className="font-medium">Batch Address Test</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Test {testAddresses.length} addresses simultaneously
          </span>
          <button
            onClick={testBatchAddresses}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm"
          >
            {isLoading ? "Testing..." : "Batch Test"}
          </button>
        </div>
      </div>

      {/* Advanced Testing */}
      {showAdvanced && (
        <div className="space-y-3">
          <h3 className="font-medium">API Endpoint Testing</h3>
          <button
            onClick={testAPIEndpoints}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
          >
            {isLoading ? "Testing..." : "Test All APIs"}
          </button>
        </div>
      )}

      {/* Recent Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Recent Test Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <TestResultDisplay key={index} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Batch Results */}
      {batchResults && (
        <div className="space-y-3">
          <h3 className="font-medium">Batch Test Results</h3>
          <div className="bg-gray-800 p-3 rounded">
            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-400">Total Duration:</span> {batchResults.totalDuration}ms
              </div>
              <div>
                <span className="text-green-400">Resolved:</span> {batchResults.successCount}
              </div>
              <div>
                <span className="text-red-400">Failed:</span> {batchResults.failureCount}
              </div>
            </div>
            <div className="space-y-2">
              {batchResults.results.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <AddressDisplay
                    address={result.address}
                    options={{ enableFallbacks: true }}
                    className="text-xs"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{result.duration.toFixed(0)}ms</span>
                    {result.source && (
                      <span className="text-blue-400 text-xs">{result.source}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Address Resolution Demo */}
      <div className="space-y-3">
        <h3 className="font-medium">Live Address Display Demo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testAddresses.slice(0, 4).map((address) => (
            <div key={address} className="bg-gray-800 p-3 rounded">
              <div className="text-xs text-gray-400 mb-1">Raw Address:</div>
              <div className="text-xs font-mono mb-2 break-all">{address}</div>
              <div className="text-xs text-gray-400 mb-1">Resolved:</div>
              <AddressDisplay
                address={address}
                options={{ enableFallbacks: true, preferFarcaster: true, preferENS: true }}
                showCopy={true}
                showTooltip={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Test result display component
function TestResultDisplay({ result }: { result: TestResult }) {
  const { address, result: resolvedResult, duration, error, source } = result;

  return (
    <div className="bg-gray-800 p-3 rounded text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs break-all">{address}</span>
        <span className="text-gray-400">{duration}ms</span>
      </div>
      
      {error ? (
        <div className="text-red-400">Error: {error}</div>
      ) : resolvedResult ? (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span>Display: {resolvedResult.display}</span>
            <span className="text-blue-400 text-xs">({resolvedResult.type})</span>
            {source && <span className="text-green-400 text-xs">{source}</span>}
          </div>
          {resolvedResult.avatar && (
            <div className="text-gray-400">Avatar: ✓</div>
          )}
          {resolvedResult.verified && (
            <div className="text-green-400">Verified: ✓</div>
          )}
          {resolvedResult.metadata && Object.keys(resolvedResult.metadata).length > 0 && (
            <div className="text-gray-400">
              Metadata: {Object.keys(resolvedResult.metadata).join(", ")}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400">No resolution</div>
      )}
    </div>
  );
}