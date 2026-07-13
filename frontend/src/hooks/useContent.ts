import { content, getContent } from '@/content'

/**
 * Custom hook for accessing centralized content
 * Usage examples:
 * - const { auth, dashboard } = useContent()
 * - const text = useContent('auth.login.title')
 * - const loginContent = useContent().auth.login
 */
export const useContent = (path?: string) => {
  if (path) {
    return getContent(path)
  }
  
  return content
}

// Specific content hooks for better type safety and convenience
export const useAuthContent = () => content.auth
export const useDashboardContent = () => content.dashboard
export const useSidebarContent = () => content.sidebar
export const useHeaderContent = () => content.header
export const useCommonContent = () => content.common
export const useAppContent = () => content.app
