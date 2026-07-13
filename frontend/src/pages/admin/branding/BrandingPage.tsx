import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/auth'
import {
  BrandingSettings,
  getBranding,
  isValidHexColor,
  updateBranding,
  validateLogoFile,
} from '@/api/branding'
import { useTheme } from '@/theme/ThemeContext'
import { sanitizeHtmlForPreview } from '@/utils/sanitizeHtml'
import './BrandingPage.css'

const defaultFormState = {
  primary_color: '#0A5FFF',
  secondary_color: '#111827',
  email_header_html: '',
  email_footer_html: '',
}

export const BrandingPage = () => {
  const { applyBranding, refreshBranding } = useTheme()
  const [savedSettings, setSavedSettings] = useState<BrandingSettings | null>(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSettings = async () => {
      try {
        const settings = await getBranding({ redirectOnForbidden: true })
        if (!isMounted) {
          return
        }
        applySettingsToForm(settings)
      } catch (error) {
        if (!isMounted) {
          return
        }
        const message =
          error instanceof ApiError ? error.message : 'Unable to load branding settings.'
        setSubmitError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!logoFile) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(logoFile)
    setLogoPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [logoFile])

  const applySettingsToForm = (settings: BrandingSettings) => {
    setSavedSettings(settings)
    setFormState({
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      email_header_html: settings.email_header_html,
      email_footer_html: settings.email_footer_html,
    })
    setSavedLogoUrl(settings.logo)
    setLogoFile(null)
    setLogoPreviewUrl(null)
    setFieldErrors({})
    setSubmitError(null)
  }

  const previewLogoUrl = logoPreviewUrl ?? savedLogoUrl

  const sanitizedHeaderPreview = useMemo(
    () => sanitizeHtmlForPreview(formState.email_header_html),
    [formState.email_header_html],
  )

  const sanitizedFooterPreview = useMemo(
    () => sanitizeHtmlForPreview(formState.email_footer_html),
    [formState.email_footer_html],
  )

  const handleColorChange = (field: 'primary_color' | 'secondary_color', value: string) => {
    setFormState((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSuccessMessage(null)

    if (!file) {
      setLogoFile(null)
      return
    }

    const validationError = validateLogoFile(file)
    if (validationError) {
      setFieldErrors((current) => ({ ...current, logo: validationError }))
      event.target.value = ''
      return
    }

    setFieldErrors((current) => {
      const next = { ...current }
      delete next.logo
      return next
    })
    setLogoFile(file)
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!isValidHexColor(formState.primary_color)) {
      nextErrors.primary_color = 'Primary color must use #RRGGBB format.'
    }

    if (!isValidHexColor(formState.secondary_color)) {
      nextErrors.secondary_color = 'Secondary color must use #RRGGBB format.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleReset = async () => {
    setSuccessMessage(null)
    setSubmitError(null)

    if (savedSettings) {
      applySettingsToForm(savedSettings)
      setSuccessMessage('Changes reverted to the last saved settings.')
      return
    }

    setIsLoading(true)
    try {
      const settings = await getBranding({ redirectOnForbidden: true })
      applySettingsToForm(settings)
      setSuccessMessage('Changes reverted to the last saved settings.')
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to reload branding settings.'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      let updatedSettings: BrandingSettings

      if (logoFile) {
        const formData = new FormData()
        formData.append('primary_color', formState.primary_color)
        formData.append('secondary_color', formState.secondary_color)
        formData.append('email_header_html', formState.email_header_html)
        formData.append('email_footer_html', formState.email_footer_html)
        formData.append('logo', logoFile)
        updatedSettings = await updateBranding(formData)
      } else {
        updatedSettings = await updateBranding({
          primary_color: formState.primary_color,
          secondary_color: formState.secondary_color,
          email_header_html: formState.email_header_html,
          email_footer_html: formState.email_footer_html,
        })
      }

      applySettingsToForm(updatedSettings)
      applyBranding(updatedSettings)
      await refreshBranding()
      setSuccessMessage('Branding settings saved successfully.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return
      }
      const message =
        error instanceof ApiError ? error.message : 'Unable to save branding settings.'
      setSubmitError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="branding-page">
          <p>Loading branding settings...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="branding-page">
        <header className="branding-header">
          <h1>Organization Branding</h1>
          <p>Manage your logo, theme colors, and email content templates.</p>
        </header>

        <form className="branding-form" onSubmit={handleSubmit} noValidate>
          <div aria-live="polite">
            {submitError && (
              <div className="branding-alert branding-alert--error" role="alert">
                {submitError}
              </div>
            )}
            {successMessage && (
              <div className="branding-alert branding-alert--success" role="status">
                {successMessage}
              </div>
            )}
          </div>

          <section className="branding-section">
            <h2>Logo</h2>
            <div className="branding-logo-row">
              <div className="branding-logo-preview" aria-label="Logo preview">
                {previewLogoUrl ? (
                  <img src={previewLogoUrl} alt="Organization logo preview" />
                ) : (
                  <span>No logo uploaded</span>
                )}
              </div>
              <div className="branding-logo-upload">
                <label htmlFor="logo-upload">Upload logo (max 2MB)</label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {fieldErrors.logo && (
                  <p className="branding-field-error" role="alert">
                    {fieldErrors.logo}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="branding-section branding-colors">
            <h2>Theme Colors</h2>
            <div className="branding-color-grid">
              <div className="branding-color-field">
                <label htmlFor="primary-color">Primary color</label>
                <div className="branding-color-input">
                  <input
                    id="primary-color"
                    type="color"
                    value={formState.primary_color}
                    onChange={(event) => handleColorChange('primary_color', event.target.value)}
                  />
                  <input
                    type="text"
                    value={formState.primary_color}
                    onChange={(event) => handleColorChange('primary_color', event.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    aria-label="Primary color hex value"
                  />
                </div>
                {fieldErrors.primary_color && (
                  <p className="branding-field-error" role="alert">
                    {fieldErrors.primary_color}
                  </p>
                )}
              </div>

              <div className="branding-color-field">
                <label htmlFor="secondary-color">Secondary color</label>
                <div className="branding-color-input">
                  <input
                    id="secondary-color"
                    type="color"
                    value={formState.secondary_color}
                    onChange={(event) => handleColorChange('secondary_color', event.target.value)}
                  />
                  <input
                    type="text"
                    value={formState.secondary_color}
                    onChange={(event) => handleColorChange('secondary_color', event.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    aria-label="Secondary color hex value"
                  />
                </div>
                {fieldErrors.secondary_color && (
                  <p className="branding-field-error" role="alert">
                    {fieldErrors.secondary_color}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="branding-section">
            <h2>Email Header HTML</h2>
            <textarea
              value={formState.email_header_html}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  email_header_html: event.target.value,
                }))
              }
              rows={6}
              aria-label="Email header HTML"
            />
            <div className="branding-preview">
              <h3>Preview</h3>
              <div
                className="branding-preview-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHeaderPreview }}
              />
            </div>
          </section>

          <section className="branding-section">
            <h2>Email Footer HTML</h2>
            <textarea
              value={formState.email_footer_html}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  email_footer_html: event.target.value,
                }))
              }
              rows={6}
              aria-label="Email footer HTML"
            />
            <div className="branding-preview">
              <h3>Preview</h3>
              <div
                className="branding-preview-content"
                dangerouslySetInnerHTML={{ __html: sanitizedFooterPreview }}
              />
            </div>
          </section>

          <div className="branding-actions">
            <Button type="button" variant="secondary" onClick={handleReset} disabled={isSaving}>
              Reset
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
