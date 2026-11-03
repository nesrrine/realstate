export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT';

/** Utilisateur renvoyé par POST /auth/login */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // Champs présents uniquement dans GET /auth/me
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  agentId?: string | null;
  agent?: {
    id: string;
    licenseNumber: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string; // ← nom exact renvoyé par le backend
  user: User;
}

export interface AuthUser {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

/** Role helpers */
export const isManager = (role: UserRole) => role === 'MANAGER';
export const isAdmin = (role: UserRole) => role === 'ADMIN';
export const isAgent = (role: UserRole) => role === 'AGENT';