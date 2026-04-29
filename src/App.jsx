import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

const fastMint = async () => {
  // We pull these values from your component's state
  const targetAddress = document.querySelector('input[placeholder="0x..."]').value;
  const mintPrice = "0.05"; // Or pull from state: const mintPrice = priceState;
  const quantity = 1n; // Using BigInt for quantity
  

  // 1. Initialize Provider with your Private RPC
  const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_PRIVATE_RPC_URL);
  
  // 2. Initialize Signer (Burner Wallet)
  const signer = new ethers.Wallet(import.meta.env.VITE_SNIPER_PRIVATE_KEY, provider);
  
  // 3. Define the DN-404 Contract
  const contract = new ethers.Contract(targetAddress, ["function mint(uint256 quantity) public payable"], signer);

  try {
    // 4. Aggressive Gas Strategy
    const feeData = await provider.getFeeData();
    const tx = await contract.mint(quantity, {
      value: ethers.parseEther(mintPrice),
     maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 200n) / 100n, // Double the tip
maxFeePerGas: (feeData.maxFeePerGas * 150n) / 100n // 1.5x the base fee
    });

    console.log(`Transaction Sent! Hash: ${tx.hash}`);
  } catch (error) {
    console.error("Mint failed:", error);
  }
};
// --- Lightweight Local UI Components ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const base = "px-4 py-3 rounded-lg font-bold transition-all active:scale-95 flex items-center justify-center";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700",
    danger: "bg-rose-600 hover:bg-rose-500 text-white"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
    <input 
      className="bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-3 text-zinc-100 outline-none transition-colors"
      {...props} 
    />
  </div>
);

// --- Main App ---
export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [wallet, setWallet] = useState('');
  const [contract, setContract] = useState('');
  const [mintPrice, setMintPrice] = useState('0.05');
  const [qty, setQty] = useState(1);
  const [gas, setGas] = useState('150');
  const [status, setStatus] = useState('Idle');
  const [logs, setLogs] = useState(['[SYSTEM] Interface initialized. Waiting for target...']);

  const addLog = (m) => setLogs(x => [`[${new Date().toLocaleTimeString()}] ${m}`, ...x].slice(0, 50));

  const connect = async () => {
    if (!window.ethereum) return addLog('ERROR: Install MetaMask to continue.');
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send('eth_requestAccounts', []);
      const s = await p.getSigner();
      setProvider(p);
      setSigner(s);
      setWallet(await s.getAddress());
      addLog('Wallet connected successfully.');
    } catch (err) {
      addLog(`ERROR: ${err.message}`);
    }
  };

  const watch = () => {
    if (!contract) return addLog('WARNING: Enter a contract address to watch.');
    addLog(`Watching mempool for target: ${contract.slice(0,6)}...${contract.slice(-4)}`);
    setStatus('Watching');
  };

  const mint = async () => {
    try {
      if (!signer) return addLog('ERROR: Wallet not connected.');
      if (!contract) return addLog('ERROR: No contract address provided.');
      
      setStatus('Submitting');
      addLog(`Preparing DN-404 mint payload...`);
      
      const tx = { 
        to: contract, 
        value: ethers.parseEther((Number(mintPrice) * Number(qty)).toString()) 
      };
      
      addLog(`Gas strategy overriding to: ${gas} gwei`);
      
      const sent = await signer.sendTransaction(tx);
      addLog(`TX Broadcasted: ${sent.hash}`);
      setStatus('Pending');
      
      await sent.wait();
      addLog('CONFIRMED: Mint transaction successful.');
      setStatus('Success');
    } catch (e) {
      addLog(`FAILED: ${e.shortMessage || e.message}`);
      setStatus('Idle');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center selection:bg-emerald-900">
      
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            DN-404 CABAL SNIPER
          </h1>
          <p className="text-zinc-500 mt-1 text-sm font-mono">HYBRID NFT/TOKEN EXECUTION TERMINAL</p>
        </div>
        <div className="font-mono text-sm">
          {wallet ? (
            <span className="px-3 py-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-900">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
          ) : (
            <span className="text-rose-500 font-bold">DISCONNECTED</span>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 text-white">Target Configuration</h2>
            <div className="space-y-4">
              <Input label="Target Contract (DN-404)" placeholder="0x..." value={contract} onChange={e => setContract(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mint Price (ETH)" placeholder="0.05" value={mintPrice} onChange={e => setMintPrice(e.target.value)} />
                <Input label="Quantity (Base Units)" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Gas Strategy</h2>
              <span className="text-emerald-400 font-mono font-bold">{gas} GWEI</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => setGas('80')}>Normal (80)</Button>
              <Button variant="secondary" onClick={() => setGas('150')}>Fast (150)</Button>
              <Button variant="secondary" onClick={() => setGas('300')} className="!text-rose-400">Aggro (300)</Button>
            </div>
            <Input label="Custom Gas" type="number" className="mt-4" placeholder="Manual gwei..." value={gas} onChange={e => setGas(e.target.value)} />
          </Card>
        </div>

        {/* Center Column: Execution */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6 flex-1 flex flex-col justify-between relative overflow-hidden">
            {/* Status Background Glow */}
            <motion.div 
              className="absolute -inset-20 opacity-10 blur-3xl pointer-events-none"
              animate={{ backgroundColor: status === 'Success' ? '#10b981' : status === 'Pending' ? '#eab308' : status === 'Submitting' ? '#3b82f6' : '#3f3f46' }}
              transition={{ duration: 1 }}
            />
            
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Execution Pipeline</h2>
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-zinc-400 uppercase text-xs tracking-widest mb-2">Current Status</p>
                <motion.div 
                  key={status}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-4xl font-black uppercase tracking-tight ${
                    status === 'Success' ? 'text-emerald-500' : 
                    status === 'Pending' ? 'text-yellow-500 animate-pulse' : 
                    status === 'Failed' ? 'text-rose-500' : 'text-zinc-300'
                  }`}
                >
                  {status}
                </motion.div>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {!wallet ? (
                <Button onClick={connect} className="w-full py-4 text-lg">Connect Wallet</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={watch} className="w-full py-4 text-lg">Auto Watch Drop</Button>
                  <Button onClick={mint} className="w-full py-4 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    EXECUTE MINT
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <Card className="p-0 flex-1 flex flex-col h-full max-h-[600px]">
            <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Live Execution Logs</h2>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
              </div>
            </div>
            <div className="p-4 font-mono text-xs text-emerald-400/80 space-y-2 overflow-y-auto flex-1 flex flex-col-reverse">
              {logs.map((l, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="break-all"
                >
                  {l}
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}