'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useCreateWallet, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import Image from 'next/image';


interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

function encodeBase58(buffer: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let string = '';
  for (let k = 0; buffer[k] === 0 && k < buffer.length - 1; k++) {
    string += ALPHABET[0];
  }
  for (let q = digits.length - 1; q >= 0; q--) {
    string += ALPHABET[digits[q]];
  }
  return string;
}

export default function TradePanel({ token }: { token: Token | null }) {
  const { user, authenticated, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { createWallet } = useCreateWallet();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [txModal, setTxModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    signature?: string;
    details?: string;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showTxError = (title: string, message: string, details?: string) => {
    setTxModal({
      isOpen: true,
      type: 'error',
      title,
      message,
      details,
    });
  };

  const showTxSuccess = (title: string, message: string, signature?: string) => {
    setTxModal({
      isOpen: true,
      type: 'success',
      title,
      message,
      signature,
    });
  };

  const presets = ['$25', '$50', '$100', '$250'];

  // Fetch and poll SOL and Token balances of the embedded wallet
  useEffect(() => {
    if (!wallets[0]?.address) return;
    
    async function fetchBalances() {
      const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com';
      
      // 1. Fetch SOL Balance
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [wallets[0].address],
          }),
        });
        const data = await res.json();
        if (data.result !== undefined) {
          setBalance(data.result.value / 1e9);
        }
      } catch (e) {
        console.error('Failed to fetch SOL balance:', e);
      }

      // 2. Fetch Token Balance
      if (token?.address) {
        try {
          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'getTokenAccountsByOwner',
              params: [
                wallets[0].address,
                { mint: token.address },
                { encoding: 'jsonParsed' }
              ],
            }),
          });
          const data = await res.json();
          if (data.result && data.result.value && data.result.value.length > 0) {
            const uiAmount = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            setTokenBalance(uiAmount !== undefined ? uiAmount : 0);
          } else {
            setTokenBalance(0);
          }
        } catch (e) {
          console.error('Failed to fetch token balance:', e);
          setTokenBalance(0);
        }
      } else {
        setTokenBalance(null);
      }
    }
    
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [wallets[0]?.address, token?.address]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary p-6 text-sm">
        Select a token to trade
      </div>
    );
  }

  const handlePreset = (value: string) => {
    setAmount(value.replace('$', ''));
  };

  const getAmountLamports = async (usdAmount: number, tokenAddress: string, decimalsDefault = 9): Promise<{ amount: number; symbol: string }> => {
    try {
      const res = await fetch(`https://api.jup.ag/price/v3?ids=${tokenAddress}`);
      const data = await res.json();
      const tokenInfo = data[tokenAddress];
      if (tokenInfo) {
        const price = tokenInfo.usdPrice || 1;
        const decimals = tokenInfo.decimals ?? decimalsDefault;
        const tokenAmount = usdAmount / price;
        return {
          amount: Math.floor(tokenAmount * Math.pow(10, decimals)),
          symbol: tokenInfo.symbol || '',
        };
      }
    } catch (e) {
      console.error('Failed to get price/decimals from Jupiter:', e);
    }
    const price = token?.price || 1;
    const tokenAmount = usdAmount / price;
    return {
      amount: Math.floor(tokenAmount * Math.pow(10, decimalsDefault)),
      symbol: token?.symbol || '',
    };
  };

  const handleTrade = async () => {
    if (!amount || isNaN(Number(amount))) return alert('Please enter a valid amount');
    if (!user) return login();
    
    let wallet = wallets[0];
    if (!wallet) {
      try {
        const result = await createWallet();
        wallet = result.wallet as any;
      } catch (error) {
        console.error('Failed to create wallet:', error);
        return alert('Failed to create Solana wallet. Please reconnect.');
      }
    }

    setIsTrading(true);
    try {
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const inputMint = mode === 'buy' ? SOL_MINT : token.address;
      const outputMint = mode === 'buy' ? token.address : SOL_MINT;
      
      const usdAmount = parseFloat(amount);
      let amountLamports = 0;

      if (mode === 'buy') {
        const { amount: computedAmount } = await getAmountLamports(usdAmount, SOL_MINT, 9);
        amountLamports = computedAmount;
      } else {
        const { amount: computedAmount } = await getAmountLamports(usdAmount, token.address, 9);
        amountLamports = computedAmount;
      }

      // 1. Get Quote from Jupiter (requesting legacy transaction format)
      const quoteResponse = await (
        await fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50&asLegacyTransaction=true`)
      ).json();

      if (quoteResponse.error) throw new Error(quoteResponse.error);

      // 2. Get Swap Transaction (requesting legacy transaction format)
      const swapResponse = await (
        await fetch('https://api.jup.ag/swap/v1/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: wallet.address,
            wrapAndUnwrapSol: true,
            asLegacyTransaction: true,
          }),
        })
      ).json();

      if (swapResponse.error) throw new Error(swapResponse.error);

      // 3. Send Transaction using Privy Wallet (bypassing raw deserialization to avoid ALT conflicts)
      const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
      
      const { signature } = await signAndSendTransaction({
        transaction: new Uint8Array(swapTransactionBuf),
        wallet,
      });

      // Convert Uint8Array signature to base58 txid
      const base58Sig = encodeBase58(signature);
      showTxSuccess(
        'Swap Successful!',
        `Successfully executed your ${mode} swap for ${token.symbol} via Jupiter!`,
        base58Sig
      );
      setAmount('');
    } catch (err: any) {
      console.error('Detailed Trade Error:', err);
      
      let errorMsg = 'Make sure your wallet has enough SOL.';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (err && typeof err === 'object') {
        const innerError = err.error || err.cause || err;
        if (innerError instanceof Error) {
          errorMsg = innerError.message;
        } else if (innerError && typeof innerError === 'object') {
          errorMsg = innerError.message || innerError.toString?.() || JSON.stringify(innerError);
        } else if (typeof innerError === 'string') {
          errorMsg = innerError;
        }
      }

      // 1. If user cancelled or rejected, exit silently
      const lowerErr = errorMsg.toLowerCase();
      if (
        lowerErr.includes('reject') ||
        lowerErr.includes('cancel') ||
        lowerErr.includes('denied') ||
        lowerErr.includes('decline')
      ) {
        setIsTrading(false);
        return;
      }

      // 2. Fetch balances to determine if it's an insufficient balance issue
      let isSolInsufficient = false;
      let isTokenInsufficient = false;
      let reqUiAmountText = '';
      
      const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com';
      let freshSolBalance = balance;
      let freshTokenBalance = tokenBalance;

      try {
        // Fetch SOL balance
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [wallet.address],
          }),
        });
        const data = await res.json();
        if (data.result !== undefined) {
          freshSolBalance = data.result.value / 1e9;
          setBalance(freshSolBalance);
        }
      } catch (e) {
        console.error('Failed to fetch SOL balance in catch:', e);
      }

      try {
        // Fetch Token balance
        if (token?.address) {
          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'getTokenAccountsByOwner',
              params: [
                wallet.address,
                { mint: token.address },
                { encoding: 'jsonParsed' }
              ],
            }),
          });
          const data = await res.json();
          let rawTokenBalance = 0;
          let decimals = 9;
          if (data.result && data.result.value && data.result.value.length > 0) {
            const tokenAmountInfo = data.result.value[0].account.data.parsed.info.tokenAmount;
            rawTokenBalance = Number(tokenAmountInfo.amount);
            decimals = tokenAmountInfo.decimals ?? 9;
            freshTokenBalance = tokenAmountInfo.uiAmount !== undefined ? tokenAmountInfo.uiAmount : 0;
            setTokenBalance(freshTokenBalance);
          } else {
            freshTokenBalance = 0;
            setTokenBalance(0);
          }

          if (mode === 'sell') {
            const usdAmount = parseFloat(amount);
            const { amount: computedAmount } = await getAmountLamports(usdAmount, token.address, decimals);
            if (rawTokenBalance < computedAmount) {
              isTokenInsufficient = true;
              const reqUiAmount = computedAmount / Math.pow(10, decimals);
              reqUiAmountText = `${reqUiAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${token.symbol}`;
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch token balance in catch:', e);
      }

      // Check SOL balance for fees (both buy and sell need at least 0.005 SOL)
      if (freshSolBalance === null || freshSolBalance < 0.005) {
        isSolInsufficient = true;
        reqUiAmountText = '0.0050 SOL';
      } else if (mode === 'buy') {
        // Buy needs SOL amount + 0.005 SOL fee
        const usdAmount = parseFloat(amount);
        const SOL_MINT = 'So11111111111111111111111111111111111111112';
        const { amount: computedSOLAmount } = await getAmountLamports(usdAmount, SOL_MINT, 9);
        const requiredSOL = (computedSOLAmount + 5000000) / 1e9;
        if (freshSolBalance < requiredSOL) {
          isSolInsufficient = true;
          reqUiAmountText = `${requiredSOL.toFixed(5)} SOL`;
        }
      }

      // 3. Show customized popup or generic error
      if (isTokenInsufficient) {
        showTxError(
          `Insufficient ${token.symbol} Balance`,
          `The transaction simulation failed because your wallet does not have enough ${token.symbol} to execute this sale.`,
          reqUiAmountText
        );
      } else if (isSolInsufficient) {
        showTxError(
          'Insufficient SOL Balance',
          'The transaction simulation failed because your wallet does not have enough SOL to cover the swap amount and network gas fees.',
          reqUiAmountText
        );
      } else {
        showTxError(
          'Transaction Failed',
          errorMsg
        );
      }
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Buy/Sell Tabs */}
      <div className="flex border-b border-border/50">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-4 font-bold text-sm transition-all duration-200 border-b-2 ${
            mode === 'buy' ? 'border-green text-green bg-green/5' : 'border-transparent text-text-secondary hover:bg-white/5'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-4 font-bold text-sm transition-all duration-200 border-b-2 ${
            mode === 'sell' ? 'border-red text-red bg-red/5' : 'border-transparent text-text-secondary hover:bg-white/5'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Input Area */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-text-tertiary">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-background border border-border/50 rounded-xl px-4 pl-10 py-5 text-3xl font-medium text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-secondary">Enter amount</span>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-6">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold text-white"
            >
              {preset}
            </button>
          ))}
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-text-secondary flex items-center justify-center px-3">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <div className="flex justify-between text-sm mb-4">
           <span className="text-text-secondary">
             {mode === 'buy'
               ? `${balance !== null ? balance.toFixed(4) : '0.0000'} SOL available`
               : `${tokenBalance !== null ? tokenBalance.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '0.0000'} ${token.symbol} available`
             }
           </span>
           <span className="text-text-secondary">$2.32 fee</span>
        </div>

        {/* Action Button */}
        {authenticated ? (
          <button
            onClick={handleTrade}
            disabled={isTrading}
            className={`w-full py-4 rounded-xl font-bold text-[15px] transition-all duration-200 disabled:opacity-50 ${
              mode === 'buy' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red/10 hover:bg-red/20 text-red'
            }`}
          >
            {isTrading ? 'Processing...' : `${mode === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`}
          </button>
        ) : (
          <button
            onClick={login}
            className="w-full py-4 rounded-xl font-bold text-[15px] bg-accent hover:bg-accent-hover text-black transition-all duration-200"
          >
            Connect Wallet
          </button>
        )}

        {/* Display Trading Wallet Address for funding */}
        {wallets[0]?.address && (
          <div className="mt-3 flex items-center justify-between text-xs text-text-secondary bg-white/5 rounded-lg px-3 py-2 border border-border/30">
            <span>Trading Wallet:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(wallets[0].address);
                alert('Wallet address copied to clipboard!');
              }}
              className="font-mono hover:text-accent font-semibold transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-border"
              title="Copy Wallet Address"
            >
              {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-6)} 📋
            </button>
          </div>
        )}

        {/* Thesis Input */}
        <div className="mt-8 border-t border-border/50 pt-6">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" alt="User" width={28} height={28} className="rounded-full bg-surface-hover" />
                 <div>
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-semibold text-white">$101.32</span>
                       <span className="text-xs font-semibold text-green">+$1.32</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-text-tertiary">293 {token.symbol}</span>
                       <span className="text-xs font-semibold text-green">▲ 1.35%</span>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="space-y-1 mb-4">
              <div className="flex justify-between text-xs">
                 <span className="text-text-secondary">Avg. entry</span>
                 <span className="font-medium text-white">$3.42</span>
              </div>
              <div className="flex justify-between text-xs">
                 <span className="text-text-secondary">Invested</span>
                 <span className="font-medium text-white">$100.00</span>
              </div>
           </div>

           <div className="bg-background rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                 <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" alt="User" width={20} height={20} className="rounded-full bg-surface-hover" />
                 <span className="text-xs font-semibold text-white">mr.stillyuhhbihh</span>
                 <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10">Thesis</span>
              </div>
              <textarea 
                className="w-full bg-transparent text-sm text-white resize-none focus:outline-none placeholder:text-text-tertiary"
                placeholder={`Write a thesis on ${token.symbol}...`}
                rows={2}
              ></textarea>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                 <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Visible to everyone
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-xs text-text-tertiary">0/100</span>
                    <button className="text-xs font-medium text-text-secondary hover:text-white transition-colors">Post</button>
                 </div>
              </div>
           </div>
        </div>

        {/* About Section */}
        <div className="mt-8">
           <h3 className="font-semibold text-white mb-2 text-sm">About {token.symbol}</h3>
           <p className="text-sm text-text-secondary">Mission critical.</p>
           
           <div className="flex gap-2 mt-4">
              {['5M', '1H', '6H', '24H'].map((t, i) => (
                 <div key={t} className="flex-1 bg-surface rounded-lg p-2 text-center">
                    <div className="text-[10px] text-text-tertiary mb-1">{t}</div>
                    <div className={`text-[11px] font-bold ${i === 2 ? 'text-red' : 'text-green'}`}>
                       {i === 2 ? '▼' : '▲'} {['12.75%', '5.84%', '0.85%', '8.93%'][i]}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Dynamic Custom Status Modal (Success / Error) */}
      {txModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#121212] border border-border/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Icon */}
            <div className="p-6 pb-4 flex flex-col items-center text-center">
              {txModal.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-green/10 border border-green/20 flex items-center justify-center mb-3 text-green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red/10 border border-red/20 flex items-center justify-center mb-3 text-red">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
              )}
              <h3 className="text-md font-bold text-white mb-2">{txModal.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed px-2">{txModal.message}</p>
            </div>
            
            {/* Details Section */}
            {txModal.type === 'success' ? (
              txModal.signature && (
                <div className="px-6 py-4 bg-white/3 border-y border-border/50 flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary">Transaction Signature</span>
                    <a
                      href={`https://solscan.io/tx/${txModal.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-accent hover:underline truncate block"
                    >
                      {txModal.signature} 🔗
                    </a>
                  </div>
                </div>
              )
            ) : (
              wallets[0]?.address && (
                <div className="px-6 py-4 bg-white/3 border-y border-border/50 flex flex-col gap-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary font-medium">Your Balance</span>
                    <span className="font-bold text-white">
                      {txModal.title.includes('SOL')
                        ? `${balance !== null ? balance.toFixed(5) : '0.0000'} SOL`
                        : `${tokenBalance !== null ? tokenBalance.toLocaleString('en-US', { maximumFractionDigits: 5 }) : '0.0000'} ${token.symbol}`
                      }
                    </span>
                  </div>
                  {txModal.details && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary font-medium">Required Estimate</span>
                      <span className="font-bold text-red">{txModal.details}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-text-tertiary">Trading Wallet Address</span>
                    <div className="flex items-center justify-between gap-2 bg-[#0A0A0A] border border-border rounded-lg p-2.5 shrink-0">
                      <span className="font-mono text-[10px] text-white truncate select-all">{wallets[0].address}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(wallets[0].address);
                          alert('Address copied!');
                        }}
                        className="text-[10px] text-accent hover:text-accent-hover font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
            
            {/* Actions */}
            <div className="p-3 bg-white/2 flex gap-2">
              {txModal.type === 'success' ? (
                <>
                  {txModal.signature && (
                    <a
                      href={`https://solscan.io/tx/${txModal.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs text-center transition-colors"
                    >
                      View on Solscan
                    </a>
                  )}
                  <button
                    onClick={() => setTxModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-xs text-center transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (wallets[0]?.address) {
                        navigator.clipboard.writeText(wallets[0].address);
                      }
                      setTxModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Copy Address & Close
                  </button>
                  <button
                    onClick={() => setTxModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
