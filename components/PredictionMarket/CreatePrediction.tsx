"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";

interface CreatePredictionProps {
  onClose: () => void;
}

export default function CreatePrediction({ onClose }: CreatePredictionProps) {
  const { address } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState("0.05");
  const [deadline, setDeadline] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const templates = [
    { t: "Run 5km this week", stake: "0.05" },
    { t: "1000 pushups in 24 hours", stake: "0.10" },
    { t: "7-day yoga streak", stake: "0.20" },
  ];

  const setTemplate = (tpl: { t: string; stake: string }) => {
    setTitle(tpl.t);
    setDescription(tpl.t);
    setStake(tpl.stake);
  };

  const submit = async () => {
    try {
      setLoading(true);
      setMessage("");
      const targetDate = Math.floor(new Date(deadline).getTime() / 1000);
      if (!targetDate || isNaN(targetDate) || targetDate <= Math.floor(Date.now()/1000)) {
        setMessage("Please pick a valid future deadline");
        return;
      }
      const userAddr = address || "0x0000000000000000000000000000000000000000";
      const resp = await fetch("/api/xmtp/create-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          targetDate,
          targetValue: 0,
          category: 0,
          network: "bsc",
          emoji: "🟡",
          userAddress: userAddr,
          autoResolvable: true,
          chain: "bsc",
        }),
      });
      const json = await resp.json();
      if (json.success) {
        setMessage(`Created! ${json.explorerUrl}`);
      } else {
        setMessage(json.message || "Failed to create");
      }
    } finally {
      setLoading(false);
    }
  };

  const aiAssist = async () => {
    setTemplate({ t: "1000 pushups in 24 hours", stake: "0.10" });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-white rounded-lg p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold">Create Prediction</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {templates.map((tpl, i) => (
            <button key={i} onClick={() => setTemplate(tpl)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded">
              {tpl.t}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs" rows={2} />
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs" />
          <div className="flex items-center gap-2">
            <input type="number" step="0.001" value={stake} onChange={(e) => setStake(e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs" />
            <span className="text-xs text-gray-400">BNB</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={aiAssist} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs">AI Assist</button>
            <button onClick={submit} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </div>
        {message && <div className="text-[10px] text-gray-400 mt-2 truncate">{message}</div>}
      </div>
    </div>
  );
}