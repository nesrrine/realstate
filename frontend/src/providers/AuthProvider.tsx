'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { clearPersistentState } from '@/hooks/use-persistent-state';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/types/auth';
import { isAdmin, isAgent, isManager } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isManager: boolean;
  isAdmin: boolean;
  isAgent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // le cookie a été lu

  useEffect(() => {
    setToken(Cookies.get('auth_token') || null);
    setReady(true);
  }, []);

  const { data, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: authService.getProfile,
    enabled: ready && !!token,
    retry: false,
    staleTime: 60_000,
  });

  // Sans token, il n'y a jamais d'utilisateur (même si une donnée traîne en cache)
  const user: User | null = token ? (data ?? null) : null;

  // Chargement tant que le cookie n'est pas lu OU que le profil charge
  const isLoading = !ready || (!!token && profileLoading);

  const login = (newToken: string) => {
    // Secure : envoyé uniquement en HTTPS (sauf en local) · Strict : jamais depuis un autre site
    Cookies.set('auth_token', newToken, {
      expires: 7,
      sameSite: 'strict',
      secure: window.location.protocol === 'https:',
    });
    queryClient.clear(); // évite les données de l'utilisateur précédent
    setToken(newToken);
    router.push('/crm/dashboard');
  };

  const logout = () => {
    Cookies.remove('auth_token');
    queryClient.clear(); // vide tout le cache (biens, clients, profil...)
    clearPersistentState(); // filtres des listes mémorisés pendant la session
    setToken(null); // désactive la requête du profil
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isManager: user ? isManager(user.role) : false,
        isAdmin: user ? isAdmin(user.role) : false,
        isAgent: user ? isAgent(user.role) : false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}