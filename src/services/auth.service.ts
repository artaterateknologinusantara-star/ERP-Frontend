import { api } from '@/lib/api';

export interface ForgotPasswordResult {
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export const authService = {
  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const res = await api.post<ForgotPasswordResult>('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, newPassword: string) {
    return api.post<void>('/auth/reset-password', { token, newPassword });
  },
};
