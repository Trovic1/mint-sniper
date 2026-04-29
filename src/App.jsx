import React, { useState } from 'react';
import { ethers } from 'ethers';

const App = () => {
  const [logs, setLogs] = useState(["[SYSTEM] Interface initialized. Waiting for target..."]);
  const [targetAddress, setTargetAddress] = useState("");
  const [mintPrice, setMintPrice] = useState("0.05");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("IDLE");

  const addLog = (msg) => setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const executeAutoMint = async () => {
    // 1. Validation
    if (!targetAddress.startsWith("0x")) {
      addLog("ERROR: Invalid Contract Address");
      return;
    }

    // 2. Setup Provider & Signer (Bypasses MetaMask)
    const RPC_URL = import.meta.env.VITE_PRIVATE_RPC_URL;
    const PRIVATE_KEY = import.meta.env.VITE_SNIPER_PRIVATE_KEY;

    if (!RPC_URL || !PRIVATE_KEY) {
      addLog("ERROR: .env missing RPC_URL or PRIVATE_KEY");
      return;
    }

    try {
      setStatus("EXECUTING");
      addLog("Initializing Pro Signer...");
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // 3. Define Contract
      const contract = new ethers.Contract(
        targetAddress, 
        ["function mint(uint256 quantity) public payable"], 
        signer
      );

      addLog("Fetching gas data for aggressive entry...");
      const feeData = await provider.getFeeData();

      // 4. Send Transaction Immediately
      addLog("Broadcasting to Mempool...");
      const tx = await contract.mint(BigInt(quantity), {
        value: ethers.parseEther(mintPrice),
        // Pro Math: 2.0x Priority, 1.5x Base
        maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 200n) / 100n,
        maxFeePerGas: (feeData.maxFeePerGas * 150n) / 100n
      });

      addLog(`TX SENT: ${tx.hash.substring(0, 15)}...`);
      setStatus("PENDING");

      const receipt = await tx.wait();
      addLog(`MINT SUCCESS: Block ${receipt.blockNumber}`);
      setStatus("SUCCESS");

    } catch (err) {
      addLog(`FAILED: ${err.reason || err.message}`);
      setStatus("IDLE");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tighter">DN-404 CABAL SNIPER</h1>
          <p className="text-xs text-zinc-500">HYBRID NFT/TOKEN EXECUTION TERMINAL</p>
        </header>

        <section className="grid gap-4 border border-zinc-800 p-4 rounded-lg bg-zinc-900/50">
          <h2 className="text-sm font-bold border-b border-zinc-800 pb-2">Target Configuration</h2>
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-zinc-500">Target Contract (DN-404)</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm" 
              placeholder="0x..." 
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-zinc-500">Mint Price (ETH)</label>
              <input 
                className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm" 
                value={mintPrice}
                onChange={(e) => setMintPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-zinc-500">Quantity</label>
              <input 
                className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="border border-zinc-800 p-4 rounded-lg bg-zinc-900/50 text-center">
          <p className="text-[10px] text-zinc-500 mb-2">CURRENT STATUS: {status}</p>
          <button 
            onClick={executeAutoMint}
            disabled={status === "EXECUTING"}
            className="w-full bg-zinc-50 text-zinc-950 py-3 font-bold hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {status === "EXECUTING" ? "FIRING..." : "EXECUTE AUTO-MINT"}
          </button>
        </section>

        <footer className="border border-zinc-800 p-4 rounded-lg bg-black text-xs h-48 overflow-y-auto">
          <p className="text-zinc-500 mb-2 uppercase font-bold">Live Execution Logs</p>
          {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
        </footer>
      </div>
    </div>
  );
};

export default App;