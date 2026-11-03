import apiClient from '@/lib/api-client';
import type { LoginCredentials, AuthResponse, User } from '@/types/auth';

export interface UpdateProfilePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const { data } = await apiClient.patch<User>('/auth/me', payload);
    return data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.patch<{ message: string }>('/auth/me/password', payload);
    return data;
  },
};