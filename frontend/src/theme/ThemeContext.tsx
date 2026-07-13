import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  BrandingSettings,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  getBranding,
  loadCachedBrandingSettings,
} from '@/api/branding'
import { ApiError } from '@/api/auth'
import { getAccessToken } from '@/api/authStorage'
import { applyBrandCssVariables } from './brandCss'

export interface ThemeContextValue {
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  isLoading: boolean
  applyBranding: (settings: Pick<BrandingSettings, 'primary_color' | 'secondary_color' | 'logo'>) => void
  refreshBranding: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function resolveInitialBranding(): Pick<BrandingSettings, 'primary_color' | 'secondary_color' | 'logo'> {
  const cached = loadCachedBrandingSettings()
  return {
    primary_color: cached?.primary_color ?? DEFAULT_PRIMARY_COLOR,
    secondary_color: cached?.secondary_color ?? DEFAULT_SECONDARY_COLOR,
    logo: cached?.logo ?? null,
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = resolveInitialBranding()
  const [primaryColor, setPrimaryColor] = useState(initial.primary_color)
  const [secondaryColor, setSecondaryColor] = useState(initial.secondary_color)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo)
  const [isLoading, setIsLoading] = useState(true)

  const applyBranding = useCallback(
    (settings: Pick<BrandingSettings, 'primary_color' | 'secondary_color' | 'logo'>) => {
      setPrimaryColor(settings.primary_color)
      setSecondaryColor(settings.secondary_color)
      setLogoUrl(settings.logo)
      applyBrandCssVariables(settings.primary_color, settings.secondary_color)
    },
    [],
  )

  const refreshBranding = useCallback(async () => {
    if (!getAccessToken()) {
      return
    }

    try {
      const settings = await getBranding({ redirectOnForbidden: false })
      applyBranding(settings)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return
      }
      throw error
    }
  }, [applyBranding])

  useEffect(() => {
    applyBrandCssVariables(primaryColor, secondaryColor)
  }, [primaryColor, secondaryColor])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        await refreshBranding()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [refreshBranding])

  const value = useMemo(
    () => ({
      primaryColor,
      secondaryColor,
      logoUrl,
      isLoading,
      applyBranding,
      refreshBranding,
    }),
    [primaryColor, secondaryColor, logoUrl, isLoading, applyBranding, refreshBranding],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
