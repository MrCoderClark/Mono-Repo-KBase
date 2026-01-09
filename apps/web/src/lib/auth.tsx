'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'kbase_access_token';
const REFRESH_TOKEN_KEY = 'kbase_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) return false;

    const response = await api.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: storedRefreshToken }
    );

    if (response.success && response.data) {
      localStorage.setItem(TOKEN_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
      api.setAccessToken(response.data.accessToken);
      return true;
    }

    return false;
  }, []);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.setAccessToken(token);
    const response = await api.get<{ user: User }>('/auth/me');

    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      // Try to refresh token
      const refreshed = await refreshToken();
      if (refreshed) {
        const retryResponse = await api.get<{ user: User }>('/auth/me');
        if (retryResponse.success && retryResponse.data) {
          setUser(retryResponse.data.user);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          api.setAccessToken(null);
        }
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        api.setAccessToken(null);
      }
    }

    setIsLoading(false);
  }, [refreshToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { email, password });

    if (response.success && response.data) {
      localStorage.setItem(TOKEN_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
      api.setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      return { success: true };
    }

    return { success: false, error: response.error?.message || 'Login failed' };
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', { email, password, name });

    if (response.success && response.data) {
      localStorage.setItem(TOKEN_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
      api.setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      return { success: true };
    }

    return { success: false, error: response.error?.message || 'Registration failed' };
  };

  const logout = async () => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    await api.post('/auth/logout', { refreshToken: refreshTokenValue });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    api.setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
