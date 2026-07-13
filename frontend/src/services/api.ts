import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '',  // relative: deployed SPA calls same-origin /api (ALB routes /api/* to the
      // backend); dev uses the vite `/api` proxy. Set VITE_API_BASE_URL only
      // when the API is on a different origin.
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  private extractData<T>(response: AxiosResponse): T {
    // Handle both wrapped and direct responses
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data
    }
    return response.data
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.api.get(url)
    return this.extractData<T>(response)
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.api.post(url, data)
    return this.extractData<T>(response)
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.api.put(url, data)
    return this.extractData<T>(response)
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.api.patch(url, data)
    return this.extractData<T>(response)
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url)
    return this.extractData<T>(response)
  }
}

export const apiService = new ApiService()
