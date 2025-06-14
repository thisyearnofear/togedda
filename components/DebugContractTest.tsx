/**
 * Debug component to test contract calls directly in the browser
 */

import { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { ethers } from 'ethers';

const BASE_CONTRACT_ADDRESS = '0xeF7009384cF166eF52e0F3529AcB79Ff53A2a3CA';
const TEST_USER_ADDRESS = '0x3d86ff165d8beb8594ae05653249116a6d1ff3f1';

const MINIMAL_ABI = [
  {
    name: 'getUserVote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_predictionId', type: 'uint256' },
      { name: '_user', type: 'address' }
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'isYes', type: 'bool' },
          { name: 'amount', type: 'uint256' },
          { name: 'claimed', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'getTotalFeePercentage',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

export default function DebugContractTest() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const baseClient = usePublicClient({ chainId: 84532 }); // Base Sepolia

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectEthersCall = async () => {
    setLoading(true);
    addResult('🔍 Testing direct ethers call...');
    
    try {
      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const contract = new ethers.Contract(BASE_CONTRACT_ADDRESS, MINIMAL_ABI, provider);
      
      addResult('📞 Calling getUserVote(1, testAddress)...');
      const vote = await contract.getUserVote(1, TEST_USER_ADDRESS);
      addResult(`✅ Direct ethers success: ${JSON.stringify({
        isYes: vote.isYes,
        amount: vote.amount.toString(),
        claimed: vote.claimed
      })}`);
      
      addResult('📞 Calling getTotalFeePercentage()...');
      const fee = await contract.getTotalFeePercentage();
      addResult(`✅ Fee percentage: ${fee.toString()}%`);
      
    } catch (error: any) {
      addResult(`❌ Direct ethers error: ${error.message}`);
    }
    setLoading(false);
  };

  const testWagmiProviderCall = async () => {
    setLoading(true);
    addResult('🔍 Testing wagmi provider call...');
    
    try {
      if (!baseClient) {
        addResult('❌ No wagmi Base client available');
        setLoading(false);
        return;
      }
      
      addResult(`📡 Wagmi client info: ${baseClient.chain?.name} (${baseClient.chain?.id})`);
      addResult(`🌐 RPC URL: ${baseClient.transport?.url || 'unknown'}`);
      
      // Convert wagmi client to ethers provider
      const rpcUrl = baseClient.transport?.url || 'https://sepolia.base.org';
      const ethersProvider = new ethers.JsonRpcProvider(rpcUrl, {
        name: baseClient.chain?.name || 'Base Sepolia',
        chainId: baseClient.chain?.id || 84532
      });
      
      const contract = new ethers.Contract(BASE_CONTRACT_ADDRESS, MINIMAL_ABI, ethersProvider);
      
      addResult('📞 Calling getUserVote(1, testAddress) via wagmi provider...');
      const vote = await contract.getUserVote(1, TEST_USER_ADDRESS);
      addResult(`✅ Wagmi provider success: ${JSON.stringify({
        isYes: vote.isYes,
        amount: vote.amount.toString(),
        claimed: vote.claimed
      })}`);
      
      addResult('📞 Calling getTotalFeePercentage() via wagmi provider...');
      const fee = await contract.getTotalFeePercentage();
      addResult(`✅ Fee percentage via wagmi: ${fee.toString()}%`);
      
    } catch (error: any) {
      addResult(`❌ Wagmi provider error: ${error.message}`);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔧 Contract Debug Test</h3>
      
      <div className="space-x-2 mb-4">
        <button
          onClick={testDirectEthersCall}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Direct Ethers
        </button>
        
        <button
          onClick={testWagmiProviderCall}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Wagmi Provider
        </button>
        
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear
        </button>
      </div>
      
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-gray-500">Click a test button to see results...</div>
        ) : (
          results.map((result, index) => (
            <div key={index} className="mb-1">
              {result}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Contract:</strong> {BASE_CONTRACT_ADDRESS}</p>
        <p><strong>Test User:</strong> {TEST_USER_ADDRESS}</p>
        <p><strong>Network:</strong> Base Sepolia (84532)</p>
      </div>
    </div>
  );
}
