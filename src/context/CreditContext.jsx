import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';

import { creditService } from '../services/creditService';
import { useAuth } from './AuthContext';

const CreditContext = createContext(null);

export const CreditProvider = ({ children }) => {
  const { user, refreshUser } = useAuth();

  const [credits, setCredits] = useState(user?.current_credits ?? 0);
  const [history, setHistory] = useState([]);
  const [loadingCredits, setLoadingCredits] = useState(false);

  useEffect(() => {
    setCredits(user?.current_credits ?? 0);
  }, [user?.current_credits]);

  const refreshCredits = useCallback(async () => {
    try {
      setLoadingCredits(true);
      const data = await creditService.getBalance();

      const nextCredits =
        typeof data?.credits_remaining === 'number'
          ? data.credits_remaining
          : typeof data?.credits === 'number'
          ? data.credits
          : 0;

      setCredits(nextCredits);

      if (refreshUser) {
        await refreshUser();
      }

      return nextCredits;
    } catch (e) {
      console.warn('refreshCredits error:', e?.message || e);
      return null;
    } finally {
      setLoadingCredits(false);
    }
  }, [refreshUser]);

  const loadCreditHistory = useCallback(async () => {
    try {
      const data = await creditService.getHistory();
      const rows = data?.items || data?.history || data || [];
      setHistory(Array.isArray(rows) ? rows : []);
      return rows;
    } catch (e) {
      console.warn('loadCreditHistory error:', e?.message || e);
      setHistory([]);
      return [];
    }
  }, []);

  const reserveCredit = useCallback(
    async payload => {
      const data = await creditService.reserve(payload);
      await refreshCredits();
      return data;
    },
    [refreshCredits],
  );

  const consumeCredit = useCallback(
    async payload => {
      const data = await creditService.consume(payload);
      await refreshCredits();
      return data;
    },
    [refreshCredits],
  );

  const refundCredit = useCallback(
    async payload => {
      const data = await creditService.refund(payload);
      await refreshCredits();
      return data;
    },
    [refreshCredits],
  );

  const value = useMemo(
    () => ({
      credits,
      history,
      loadingCredits,
      refreshCredits,
      loadCreditHistory,
      reserveCredit,
      consumeCredit,
      refundCredit,
      setCredits,
    }),
    [
      credits,
      history,
      loadingCredits,
      refreshCredits,
      loadCreditHistory,
      reserveCredit,
      consumeCredit,
      refundCredit,
    ],
  );

  return (
    <CreditContext.Provider value={value}>{children}</CreditContext.Provider>
  );
};

export const useCredits = () => {
  const ctx = useContext(CreditContext);
  if (!ctx) {
    throw new Error('useCredits must be used inside CreditProvider');
  }
  return ctx;
};