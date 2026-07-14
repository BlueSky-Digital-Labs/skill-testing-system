import { useCallback, useState } from 'react'
import { ApiError } from '@/api/auth'
import {
  getCertificate,
  issueCertificate,
  type CertificateDto,
} from '@/api/results'
import type { CertificateLinkState } from '@components/results/CertificateLink'

interface UseCertificateOptions {
  attemptId?: string
  canGenerate?: boolean
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export function useCertificate({
  attemptId,
  canGenerate = false,
  showToast,
}: UseCertificateOptions) {
  const [certificate, setCertificate] = useState<CertificateDto | null>(null)
  const [certificateState, setCertificateState] =
    useState<CertificateLinkState>('loading')
  const [certificateError, setCertificateError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadCertificate = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setCertificateState('loading')
    setCertificateError(null)

    try {
      const payload = await getCertificate(attemptId)
      if (payload === null) {
        setCertificate(null)
        setCertificateState('unavailable')
        return
      }

      setCertificate(payload)
      setCertificateState(payload.url ? 'available' : 'expired')
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load certificate.'
      setCertificate(null)
      setCertificateError(message)
      setCertificateState('error')
      showToast(message, 'error')
    }
  }, [attemptId, showToast])

  const handleGenerate = useCallback(async () => {
    if (!attemptId || !canGenerate) {
      return
    }

    setIsGenerating(true)
    setCertificateError(null)

    try {
      const payload = await issueCertificate(attemptId)
      setCertificate(payload)
      setCertificateState(payload.url ? 'available' : 'expired')
      showToast('Certificate generated successfully.', 'success')
    } catch (generateError) {
      const message =
        generateError instanceof ApiError
          ? generateError.message
          : 'Unable to generate certificate.'
      setCertificateError(message)
      setCertificateState('error')
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [attemptId, canGenerate, showToast])

  const handleRefresh = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setIsRefreshing(true)
    setCertificateError(null)

    try {
      const payload = await getCertificate(attemptId)
      if (payload === null) {
        setCertificate(null)
        setCertificateState('unavailable')
        showToast('Certificate is not available yet.', 'info')
        return
      }

      setCertificate(payload)
      setCertificateState(payload.url ? 'available' : 'expired')
      if (payload.url) {
        showToast('Download link refreshed.', 'success')
      }
    } catch (refreshError) {
      const message =
        refreshError instanceof ApiError
          ? refreshError.message
          : 'Unable to refresh certificate link.'
      setCertificateError(message)
      setCertificateState('error')
      showToast(message, 'error')
    } finally {
      setIsRefreshing(false)
    }
  }, [attemptId, showToast])

  const handleDownload = useCallback(() => {
    if (!certificate?.url) {
      setCertificateState('expired')
      showToast('Download link has expired. Refresh to get a new link.', 'info')
      return
    }

    window.open(certificate.url, '_blank', 'noopener,noreferrer')
  }, [certificate, showToast])

  return {
    certificate,
    certificateState,
    certificateError,
    isGenerating,
    isRefreshing,
    loadCertificate,
    handleGenerate,
    handleRefresh,
    handleDownload,
  }
}
