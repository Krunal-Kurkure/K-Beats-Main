import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { clearTokens, getAccessToken } from '../storage/tokenStorage';
import { authService } from '../services/authService';
import { normalizeEmail } from '../utils/validators';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const hydrateSession = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (!token) {
        setUser(null);
        return null;
      }

      const me = await authService.me();
      const nextUser = me?.user || me || null;

      setUser(nextUser);
      return nextUser;
    } catch (e) {
      console.warn('hydrateSession error:', e?.message || e);
      await clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const register = useCallback(
    async payload => {
      const body = {
        full_name: payload.full_name?.trim() || '',
        email: normalizeEmail(payload.email),
        password: payload.password || '',
        confirm_password: payload.confirm_password || '',
        gender: payload.gender || 'other',
        avatar: payload.avatar || '',
      };

      const data = await authService.register(body);

      if (data?.access_token) {
        await hydrateSession();
      } else if (data?.user) {
        setUser(data.user);
      }

      return data;
    },
    [hydrateSession],
  );

  const login = useCallback(
    async payload => {
      const body = {
        email: normalizeEmail(payload.email),
        password: payload.password || '',
      };

      const data = await authService.login(body);

      if (data?.access_token) {
        await hydrateSession();
      }

      return data;
    },
    [hydrateSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('logout error:', e?.message || e);
      await clearTokens();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.me();
      const nextUser = me?.user || me || null;
      setUser(nextUser);
      return nextUser;
    } catch (e) {
      console.warn('refreshUser error:', e?.message || e);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authReady,
      isLoggedIn: !!user,
      creditsRemaining: user?.current_credits ?? 0,
      register,
      login,
      logout,
      refreshUser,
      setUser,
    }),
    [user, loading, authReady, register, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};