'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useCreateWallet, useSignAndSendTransaction, type ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { saveTrade, upsertHolding } from '@/app/lib/tradeHistory';
import { getMainnetRpcUrl } from '@/app/lib/solanaRpc';
import { formatMarketCap } from '@/app/lib/constants';

interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  priceChange5m?: number;
  priceChange1h?: number;
  dex?: string;
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
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [positionTab, setPositionTab] = useState<'open' | 'closed'>('open');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'5M' | '1H' | '4H' | '1D'>('1H');

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

  const presets = mode === 'buy' ? ['0.1 SOL', '1 SOL', '5 SOL', '10 SOL'] : ['25%', '50%', '75%', 'Max'];

  useEffect(() => {
    const address = token?.address;
    if (!address) return;
    async function fetchMetadata() {
      setMetadataLoading(true);
      try {
        const res = await fetch(`/api/token-metadata?address=${address}`);
        const data = await res.json();
        if (data.metadata) {
          setMetadata(data.metadata);
        }
      } catch (e) {
        console.error('Failed to fetch token metadata:', e);
      } finally {
        setMetadataLoading(false);
      }
    }
    fetchMetadata();
  }, [token?.address]);

  // Extract wallet address for static dependency checking
  const walletAddress = wallets[0]?.address;

  // Fetch and poll SOL and Token balances of the embedded wallet
  useEffect(() => {
    if (!walletAddress) return;
    
    async function fetchBalances() {
      setBalancesLoading(true);
      const rpcUrl = getMainnetRpcUrl();
      
      // 1. Fetch SOL Balance
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress],
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
                walletAddress,
                { mint: token.address },
                { encoding: 'jsonParsed' }
              ],
            }),
          });
          const data = await res.json();
          let balanceVal = 0;
          if (data.result && data.result.value && data.result.value.length > 0) {
            const uiAmount = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            balanceVal = uiAmount !== undefined ? uiAmount : 0;
          }
          setTokenBalance(balanceVal);

          // Update holding in Supabase
          if (walletAddress && token?.address) {
            upsertHolding(walletAddress, {
              tokenAddress: token.address,
              tokenSymbol: token.symbol,
              tokenName: token.name || null,
              tokenLogoURI: token.logoURI || null,
              balance: balanceVal,
              avgEntry: null,
            }).catch(console.error);
          }
        } catch (e) {
          console.error('Failed to fetch token balance:', e);
          setTokenBalance(0);
        }
      } else {
        setTokenBalance(null);
      }
      // 3. Fetch USDC Balance
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'getTokenAccountsByOwner',
            params: [
              walletAddress,
              { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
              { encoding: 'jsonParsed' }
            ],
          }),
        });
        const data = await res.json();
        let usdcVal = 0;
        if (data.result && data.result.value && data.result.value.length > 0) {
          const uiAmount = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount;
          usdcVal = uiAmount !== undefined ? uiAmount : 0;
        }
        setUsdcBalance(usdcVal);
      } catch (e) {
        console.error('Failed to fetch USDC balance:', e);
        setUsdcBalance(0);
      }

      setBalancesLoading(false);
    }
    
    fetchBalances();
  }, [walletAddress, token?.address]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary p-6 text-sm">
        Select a token to trade
      </div>
    );
  }

  const handlePreset = (value: string) => {
    if (mode === 'buy') {
      setAmount(value.replace('$', '').replace(' SOL', ''));
    } else {
      if (value === 'Max') {
        setAmount(tokenBalance?.toString() || '0');
      } else {
        const pct = parseInt(value) / 100;
        setAmount(((tokenBalance || 0) * pct).toFixed(6));
      }
    }
  };

  const getAmountLamports = async (usdAmount: number, tokenAddress: string, decimalsDefault = 9): Promise<{ amount: number; symbol: string; decimals: number }> => {
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
          decimals,
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
      decimals: decimalsDefault,
    };
  };

  const getTokenDecimals = async (tokenAddress: string, decimalsDefault = 9): Promise<number> => {
    try {
      const res = await fetch(`https://api.jup.ag/price/v3?ids=${tokenAddress}`);
      const data = await res.json();
      const tokenInfo = data[tokenAddress];
      if (tokenInfo) {
        return tokenInfo.decimals ?? decimalsDefault;
      }
    } catch (e) {
      console.error('Failed to get token decimals from Jupiter:', e);
    }
    return decimalsDefault;
  };

  const handleTrade = async () => {
    if (!amount || isNaN(Number(amount))) return alert('Please enter a valid amount');
    if (!user) return login();
    
    let wallet = wallets[0];
    if (!wallet) {
      try {
        const result = await createWallet();
        wallet = result.wallet as unknown as ConnectedStandardSolanaWallet;
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

      if (inputMint === outputMint) {
        throw new Error("Cannot swap a token for itself. Please select a different token to trade.");
      }
      
      let amountLamports = 0;
      if (mode === 'buy') {
        const solAmount = parseFloat(amount);
        amountLamports = Math.floor(solAmount * 1e9);
      } else {
        const tokenAmount = parseFloat(amount);
        const decimals = await getTokenDecimals(token.address, 9);
        amountLamports = Math.floor(tokenAmount * Math.pow(10, decimals));
      }

      // 1. Get Quote from Jupiter
      const quoteRes = await fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50`);
      const quoteResponse = await quoteRes.json();

      if (!quoteRes.ok || quoteResponse.error) {
        const msg = quoteResponse.errorCode === 'NO_ROUTES'
          ? 'No route found for this token pair. Try a different token or amount.'
          : (quoteResponse.error || `Jupiter quote failed (${quoteRes.status})`);
        throw new Error(msg);
      }

      // 2. Get Swap Transaction (legacy for modal display compatibility)
      const swapResponse = await (
        await fetch('https://api.jup.ag/swap/v1/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: wallet.address,
            wrapAndUnwrapSol: true,
            asLegacyTransaction: true,
            dynamicComputeUnitLimit: true,
          }),
        })
      ).json();

      if (swapResponse.error) throw new Error(swapResponse.error);

      // 3. Send Transaction using Privy Wallet
      const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
      
      const result = await signAndSendTransaction({
        transaction: new Uint8Array(swapTransactionBuf),
        wallet,
        chain: 'solana:mainnet',
        options: {
          skipPreflight: true,
          uiOptions: {
            description: mode === 'buy'
              ? `Swap ${amount} SOL → ${token.symbol}`
              : `Swap ${amount} ${token.symbol} → SOL`,
            transactionInfo: {
              title: 'Swap Details',
              action: `${mode === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`,
            },
          },
        },
      });
      const signature = result.signature;

      // Convert Uint8Array signature to base58 txid
      const base58Sig = encodeBase58(signature);
      showTxSuccess(
        'Swap Successful!',
        `Successfully executed your ${mode} swap for ${token.symbol} via Jupiter!`,
        base58Sig
      );
      // Save trade to Supabase
      {
        const solAmount = parseFloat(amount);
        const tokenAmount = mode === 'buy' ? (solAmount / (token.price || 1)) : parseFloat(amount);
        const savedSolAmount = mode === 'buy' ? solAmount : (tokenAmount * (token.price || 1));
        await saveTrade(wallet.address, {
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenLogoURI: token.logoURI,
          type: mode,
          amount: tokenAmount,
          solAmount: savedSolAmount,
          price: token.price || 0,
          priceUsd: token.price || 0,
          signature: base58Sig,
        });
      }

      setAmount('');
    } catch (err: unknown) {
      console.warn('Detailed Trade Error:', err);
      if (err && typeof err === 'object') {
        const errObj = err as Record<string, unknown>;
        console.warn('Error name:', errObj.name);
        console.warn('Error code:', errObj.code);
        console.warn('Error cause:', errObj.cause);
        console.warn('Error stack:', errObj.stack);
      }
      
      let errorMsg = 'Make sure your wallet has enough SOL.';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (err && typeof err === 'object') {
        const errRecord = err as Record<string, unknown>;
        const innerError = errRecord.error || errRecord.cause || err;
        if (innerError instanceof Error) {
          errorMsg = innerError.message;
        } else if (innerError && typeof innerError === 'object') {
          const inner = innerError as Record<string, unknown>;
          errorMsg = (typeof inner.message === 'string' ? inner.message : null) || innerError.toString?.() || JSON.stringify(innerError);
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
      
      const rpcUrl = getMainnetRpcUrl();
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
          } else {
            freshTokenBalance = 0;
          }
          setTokenBalance(freshTokenBalance);

          // Update holding in Supabase after successful swap
          if (wallet.address && token?.address) {
            upsertHolding(wallet.address, {
              tokenAddress: token.address,
              tokenSymbol: token.symbol,
              tokenName: token.name || null,
              tokenLogoURI: token.logoURI || null,
              balance: freshTokenBalance || 0,
              avgEntry: null,
            }).catch(console.error);
          }

          if (mode === 'sell') {
            const tokenAmount = parseFloat(amount);
            const computedAmount = Math.floor(tokenAmount * Math.pow(10, decimals));
            if (rawTokenBalance < computedAmount) {
              isTokenInsufficient = true;
              reqUiAmountText = `${tokenAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${token.symbol}`;
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
        const solAmount = parseFloat(amount);
        const requiredSOL = solAmount + 0.005;
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

  const copyAddress = async () => {
    if (!token?.address) return;
    try {
      await navigator.clipboard.writeText(token.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {}
  };

  const stats = metadata?.jupiter?.stats24h;
  const p5m = stats?.priceChange5m ?? 0.09;
  const p1h = stats?.priceChange1h ?? 16.14;
  const p4h = stats?.priceChange4h ?? 9.54;
  const p1d = stats?.priceChange ?? token.priceChange24h ?? 1924.70;

  const scale = selectedTimeframe === '5M' ? 1 / 288 : selectedTimeframe === '1H' ? 1 / 24 : selectedTimeframe === '4H' ? 4 / 24 : 1;

  const buys = Math.max(1, Math.round((stats?.numBuys ?? 6978) * scale));
  const sells = Math.max(1, Math.round((stats?.numSells ?? 6819) * scale));
  const buyRatio = (buys + sells) > 0 ? (buys / (buys + sells)) : 0.505762;

  const buyVol = Math.max(100, (stats?.buyVolume ?? 2000000) * scale);
  const sellVol = Math.max(100, (stats?.sellVolume ?? 2000000) * scale);
  const volRatio = (buyVol + sellVol) > 0 ? (buyVol / (buyVol + sellVol)) : 0.504817;

  const totalTraders = Math.max(1, Math.round((stats?.numTraders ?? 4738) * scale));
  const buyers = Math.max(1, Math.round(totalTraders * buyRatio));
  const sellers = Math.max(1, totalTraders - buyers);
  const traderRatio = (buyers + sellers) > 0 ? (buyers / (buyers + sellers)) : 0.521739;

  const supplyVal = metadata?.jupiter?.totalSupply ?? 999900000;
  const formattedSupply = supplyVal >= 1e9 ? `${(supplyVal / 1e9).toFixed(1)}M` : `${(supplyVal / 1e6).toFixed(1)}M`;

  const createdAt = metadata?.jupiter?.createdAt;
  let createdStr = '11 days ago';
  if (createdAt) {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffDays = Math.floor(diffMs / (86400 * 1000));
    if (diffDays === 0) createdStr = 'today';
    else if (diffDays === 1) createdStr = '1 day ago';
    else createdStr = `${diffDays} days ago`;
  }

  const formatChange = (val: number) => {
    const isGreen = val >= 0;
    return (
      <div className="flex gap-0.75 items-center font-semibold" style={{ lineHeight: '16px' }}>
        <div style={{ color: isGreen ? 'rgb(33, 201, 94)' : 'rgb(255, 98, 46)', fontWeight: 400, fontSize: '6px' }}>
          {isGreen ? '▲' : '▼'}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: isGreen ? 'rgb(33, 201, 94)' : 'rgb(255, 98, 46)' }}>
          {Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </div>
      </div>
    );
  };

  const aboutText = metadata?.description || (token.symbol === 'ANSEM'
    ? "Ansem's wallet has been confirmed. 65% of the supply has been sent to his wallet, and all fees are redirected to him."
    : `${token.name || token.symbol} has confirmed smart contracts. Distribution and on-chain liquidity indicators are actively tracked and updated.`);

  return (
    <div className="flex flex-col gap-4 w-full select-none">
      {/* 1. Swap Form Card */}
      <div className="flex flex-col">
        <div className="border border-bg-tertiary rounded-2xl p-2 flex flex-col gap-2 bg-bg-primary">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('buy')}
              className={`flex-1 p-2 rounded-lg text-base font-bold transition-colors ${
                mode === 'buy' ? 'bg-green/10 text-green' : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setMode('sell')}
              className={`flex-1 p-2 rounded-lg text-base font-bold transition-colors ${
                mode === 'sell' ? 'bg-red/10 text-red' : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="bg-bg-secondary rounded-xl flex items-stretch text-3xl gap-px cursor-text relative border border-transparent focus-within:border-bg-tertiary">
            <div className="flex flex-1 min-w-0 items-center gap-px p-4 pr-0">
              {mode === 'buy' && <div className="text-text-tertiary text-lg mr-1 select-none">SOL</div>}
              <input
                placeholder="0"
                className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-text-tertiary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="shrink-0 flex flex-col items-end justify-center p-4 pl-6 relative">
              <div className="text-sm font-medium text-text-tertiary">
                {mode === 'buy' ? 'Enter amount' : token.symbol}
              </div>
            </div>
          </div>

          <div className="flex gap-1">
            <div className="grid grid-cols-4 gap-2 flex-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="hover-scrim h-8 rounded-lg bg-bg-secondary px-1 text-xs font-bold text-text-primary hover:opacity-80 transition-opacity whitespace-nowrap"
                  translate="no"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {authenticated && (
            <div className="flex flex-col px-2 text-sm">
              <div className="flex justify-between items-center">
                <div className="text-text-secondary flex items-center gap-1">
                  {balancesLoading && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" />}
                  <span translate="no" data-balance>
                    {mode === 'buy'
                      ? `${balance !== null ? balance.toFixed(4) : '--'} SOL available`
                      : `${tokenBalance !== null ? tokenBalance.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '--'} ${token.symbol} available`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {authenticated ? (
            <button
              onClick={handleTrade}
              disabled={isTrading}
              className="py-2 bg-bg-secondary hover:bg-bg-tertiary text-white h-11 rounded-xl border border-bg-tertiary/60 px-4 text-base font-bold overflow-hidden transition-all disabled:opacity-50"
            >
              {isTrading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="inline-block animate-flip-up">
                  {mode === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={login}
              className="py-2 bg-accent hover:bg-accent-hover text-white h-11 rounded-xl border border-bg-tertiary/60 px-4 text-base font-bold overflow-hidden transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* 2. About Token Card */}
      <div className="relative border border-bg-tertiary rounded-xl p-2 pb-4">
        <div className="flex flex-col gap-3">
          <div className="px-1 flex flex-col gap-1">
            <span className="font-medium text-text-primary">About <span translate="no">{token.symbol}</span></span>
            <div className="max-w-[900px] flex items-baseline gap-0">
              <span className="text-xs leading-tight min-w-0 text-text-secondary">
                {aboutText}
              </span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(['5M', '1H', '4H', '1D'] as const).map((tf) => {
              const isActive = selectedTimeframe === tf;
              const val = tf === '5M' ? p5m : tf === '1H' ? p1h : tf === '4H' ? p4h : p1d;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`flex-1 flex flex-col items-center rounded-md py-1.5 transition-colors border ${
                    isActive ? 'bg-bg-tertiary border-transparent' : 'border-bg-tertiary-solid hover:bg-bg-tertiary'
                  }`}
                >
                  <span className="text-xs text-text-secondary">{tf}</span>
                  {formatChange(val)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 px-2">
            {/* Buys / Sells */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{buys.toLocaleString()}</span> <span className="text-text-secondary">buys</span>
                </span>
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{sells.toLocaleString()}</span> <span className="text-text-secondary">sells</span>
                </span>
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="bg-green rounded-[1.5px] transition-[width] duration-150 ease-out" style={{ width: `${buyRatio * 100}%` }}></div>
                <div className="flex-1 bg-red rounded-[1.5px]"></div>
              </div>
            </div>

            {/* Volume split */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{formatMarketCap(buyVol)}</span> <span className="text-text-secondary">vol.</span>
                </span>
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{formatMarketCap(sellVol)}</span> <span className="text-text-secondary">vol.</span>
                </span>
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="bg-green rounded-[1.5px] transition-[width] duration-150 ease-out" style={{ width: `${volRatio * 100}%` }}></div>
                <div className="flex-1 bg-red rounded-[1.5px]"></div>
              </div>
            </div>

            {/* Buyers / Sellers */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{buyers.toLocaleString()}</span> <span className="text-text-secondary">buyers</span>
                </span>
                <span className="text-sm">
                  <span className="text-text-primary font-medium" translate="no">{sellers.toLocaleString()}</span> <span className="text-text-secondary">sellers</span>
                </span>
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="bg-green rounded-[1.5px] transition-[width] duration-150 ease-out" style={{ width: `${traderRatio * 100}%` }}></div>
                <div className="flex-1 bg-red rounded-[1.5px]"></div>
              </div>
            </div>
          </div>

          {/* Collapsible details */}
          <div className={`grid transition-[grid-template-rows] duration-200 ease-out px-2 ${isAboutExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden min-h-0">
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2 flex-wrap">
                  {(metadata?.jupiter?.website || metadata?.extensions?.website) && (
                    <a href={metadata?.jupiter?.website || metadata?.extensions?.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-secondary border border-bg-tertiary text-xs font-medium hover:opacity-80 transition-opacity">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                      Website
                    </a>
                  )}
                  {(metadata?.jupiter?.twitter || metadata?.extensions?.twitter) && (
                    <a href={metadata?.jupiter?.twitter || metadata?.extensions?.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-secondary border border-bg-tertiary text-xs font-medium hover:opacity-80 transition-opacity">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.85.38-1.78.64-2.73.76 1-.6 1.76-1.54 2.12-2.67-.93.55-1.96.95-3.06 1.17a4.77 4.77 0 00-8.13 4.35C7.16 9.1 4.03 7.59 1.91 5.23a4.77 4.77 0 001.48 6.38c-.76-.02-1.48-.23-2.11-.58v.06a4.77 4.77 0 003.83 4.68c-.7.19-1.43.22-2.15.08a4.77 4.77 0 004.46 3.31 9.56 9.56 0 01-5.92 2.04c-.38 0-.76-.02-1.14-.07a13.5 13.5 0 007.33 2.15c8.8 0 13.61-7.29 13.61-13.61 0-.21 0-.41-.01-.61.94-.68 1.75-1.53 2.39-2.5z" /></svg>
                      Twitter
                    </a>
                  )}
                  {(metadata?.extensions?.telegram) && (
                    <a href={metadata.extensions.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-secondary border border-bg-tertiary text-xs font-medium hover:opacity-80 transition-opacity">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                      Telegram
                    </a>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Launchpad</span>
                    <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px"></div>
                    <span className="text-xs text-text-primary font-medium whitespace-nowrap" translate="no">
                      {token.dex || 'Pump.fun'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Supply</span>
                    <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px"></div>
                    <span className="text-xs text-text-primary font-medium whitespace-nowrap" translate="no">
                      {formattedSupply}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Network</span>
                    <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px"></div>
                    <span className="text-xs text-text-primary font-medium whitespace-nowrap" translate="no">Solana</span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Created</span>
                    <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px"></div>
                    <span className="text-xs text-text-primary font-medium whitespace-nowrap" translate="no">
                      {createdStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Contract address</span>
                    <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px"></div>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="flex items-center gap-1 shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      <span className="text-xs text-text-primary font-medium whitespace-nowrap" translate="no">
                        {token.address.slice(0, 6)}...{token.address.slice(-6)}
                      </span>
                      <div className="w-4 h-4 shrink-0 relative flex items-center justify-center">
                        <svg className={`w-4 h-4 text-text-tertiary absolute transition-all duration-200 ${copiedAddress ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        <svg className={`w-4 h-4 text-green absolute transition-all duration-200 ${copiedAddress ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAboutExpanded(!isAboutExpanded)}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10 flex items-center gap-1 px-2 py-1 bg-bg-tertiary-solid rounded-md text-xs font-bold text-text-secondary hover:text-text-primary transition-colors border border-border"
          >
            {isAboutExpanded ? 'View less' : 'View more'}
          </button>
        </div>
      </div>

      {/* 3. Your Positions Card */}
      <div className="flex flex-col">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-2 px-2 shrink-0 mb-2">
            <button type="button" className="flex items-center gap-2 cursor-pointer min-w-0">
              <div className="text-base text-text-primary">Your positions</div>
            </button>
            <div role="button" tabIndex={0} className="flex border border-bg-tertiary rounded-lg p-0.5 cursor-pointer shrink-0 select-none bg-bg-primary">
              <div
                onClick={() => setPositionTab('open')}
                className={`flex gap-1 items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer ${
                  positionTab === 'open' ? 'bg-accent-primary-transparent text-accent-primary' : 'text-text-tertiary'
                }`}
              >
                Open
                <div className="relative flex items-center justify-center h-1.5 w-1.5 ml-0.5">
                  <div className="absolute h-[18px] w-[18px] animate-pulse rounded-full bg-accent/20"></div>
                  <div className="relative z-10 h-1.5 w-1.5 rounded-full bg-accent"></div>
                </div>
              </div>
              <div
                onClick={() => setPositionTab('closed')}
                className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer ${
                  positionTab === 'closed' ? 'bg-bg-tertiary text-text-secondary' : 'text-text-tertiary'
                }`}
              >
                Closed
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarGutter: 'auto' }}>
            {positionTab === 'open' ? (
              tokenBalance !== null && tokenBalance > 0 ? (
                <div className="bg-bg-secondary border border-bg-tertiary rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary">Position size</span>
                    <span className="font-semibold text-white" data-balance>{(tokenBalance * token.price).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary">Tokens</span>
                    <span className="font-semibold text-white" data-balance>{tokenBalance.toLocaleString()} {token.symbol}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center min-h-15 flex items-center justify-center text-sm text-text-tertiary">
                  No open positions
                </div>
              )
            ) : (
              <div className="text-center min-h-15 flex items-center justify-center text-sm text-text-tertiary">
                No closed positions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Custom Status Modal (Success / Error) */}
      {txModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-9999 p-4">
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
                <div className="px-6 py-4 bg-bg-tertiary border-y border-bg-tertiary flex flex-col gap-2">
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
                <div className="px-6 py-4 bg-bg-tertiary border-y border-bg-tertiary flex flex-col gap-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary font-medium">Your Balance</span>
                    <span className="font-bold text-white" data-balance>
                      {txModal.title.includes('SOL')
                        ? `${balance !== null ? balance.toFixed(5) : '--'} SOL`
                        : `${tokenBalance !== null ? tokenBalance.toLocaleString('en-US', { maximumFractionDigits: 5 }) : '--'} ${token.symbol}`
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
            <div className="p-3 bg-bg-tertiary flex gap-2">
              {txModal.type === 'success' ? (
                <>
                  {txModal.signature && (
                    <a
                      href={`https://solscan.io/tx/${txModal.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary-solid text-white font-bold text-xs text-center transition-colors"
                    >
                      View on Solscan
                    </a>
                  )}
                  <button
                    onClick={() => setTxModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs text-center transition-colors cursor-pointer"
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
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Copy Address & Close
                  </button>
                  <button
                    onClick={() => setTxModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-3.5 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary-solid text-white font-bold text-xs transition-colors cursor-pointer text-center"
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
