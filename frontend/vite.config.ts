import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || __dirname, './src'),
      '@components': path.resolve(import.meta.dirname || __dirname, './src/components'),
      '@pages': path.resolve(import.meta.dirname || __dirname, './src/pages'),
      '@hooks': path.resolve(import.meta.dirname || __dirname, './src/hooks'),
      '@utils': path.resolve(import.meta.dirname || __dirname, './src/utils'),
      '@store': path.resolve(import.meta.dirname || __dirname, './src/store'),
      '@services': path.resolve(import.meta.dirname || __dirname, './src/services'),
      '@types': path.resolve(import.meta.dirname || __dirname, './src/types'),
      '@assets': path.resolve(import.meta.dirname || __dirname, './src/assets')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Production is served by `vite preview` (see entrypoint.sh). Vite's preview
  // server rejects requests whose Host header isn't in `allowedHosts`, which
  // breaks access behind a load balancer on a custom hostname (the ALB health
  // check + browser both get "Blocked request. This host is not allowed.").
  // Allow any host for deployed environments. Restrict to your domains if desired.
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true
  }
})
