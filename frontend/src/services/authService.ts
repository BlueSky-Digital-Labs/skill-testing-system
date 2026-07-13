import { apiService } from './api'
import { LoginCredentials, RegisterCredentials, User, AuthResponse } from '@/types/auth'

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/api/auth/login/', credentials)
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/api/auth/register/', credentials)
  }

  async getCurrentUser(): Promise<User> {
    return apiService.get<User>('/api/auth/me/')
  }

  async logout(): Promise<void> {
    return apiService.post<void>('/api/auth/logout/')
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    return apiService.post<{ access_token: string }>('/api/auth/refresh/', {
      refresh_token: refreshToken,
    })
  }
}

export const authService = new AuthService()
