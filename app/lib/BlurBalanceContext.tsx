'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BlurBalanceContextType {
  isBlurred: boolean;
  toggleBlur: () => void;
}

const BlurBalanceContext = createContext<BlurBalanceContextType>({
  isBlurred: false,
  toggleBlur: () => {},
});

export function BlurBalanceProvider({ children }: { children: ReactNode }) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('blurBalances');
    if (stored === 'true') {
      setIsBlurred(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('blurBalances', String(isBlurred));
    document.documentElement.classList.toggle('blur-balances', isBlurred);
  }, [isBlurred, mounted]);

  const toggleBlur = () => setIsBlurred(prev => !prev);

  return (
    <BlurBalanceContext.Provider value={{ isBlurred, toggleBlur }}>
      {children}
    </BlurBalanceContext.Provider>
  );
}

export function useBlurBalance() {
  return useContext(BlurBalanceContext);
}
