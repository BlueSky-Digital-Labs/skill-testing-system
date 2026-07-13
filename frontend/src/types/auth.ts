export interface User {
  id: number
  email: string
  date_joined: string
  is_active: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  password_confirm: string
}

export interface AuthResponse {
  user: User
  access: string
  refresh: string
}
