import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import { CertificateLink } from '@components/results/CertificateLink'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { ApiError } from '@/api/auth'
import { getCandidateResult, type CandidateResult } from '@/api/results'
import { ResultContent } from './ResultContent'
import { useCertificate } from './useCertificate'
import './results.css'

export function AdminResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { showToast } = useToast()
  const { isAdmin, isChecking } = useAdminAccess()

  const [result, setResult] = useState<CandidateResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canGenerate = isAdmin && result?.summary?.passed === true

  const {
    certificate,
    certificateState,
    certificateError,
    isGenerating,
    isRefreshing,
    loadCertificate,
    handleGenerate,
    handleRefresh,
    handleDownload,
  } = useCertificate({
    attemptId,
    canGenerate,
    showToast,
  })

  const loadResult = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = await getCandidateResult(attemptId)
      setResult(payload)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load attempt results.'
      setError(message)
      setResult(null)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [attemptId, showToast])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadResult(), loadCertificate()])
  }, [loadResult, loadCertificate])

  useEffect(() => {
    void loadResult()
    void loadCertificate()
  }, [loadResult, loadCertificate])

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="results-page">
          <p className="results-error">Attempt ID is required.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (isChecking) {
    return (
      <DashboardLayout>
        <div className="results-page">
          <p>Checking permissions...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="results-page">
          <p className="results-error" role="alert">
            You do not have permission to view admin results.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const showCertificateSection = result?.summary?.passed === true

  return (
    <DashboardLayout>
      <div className="results-page">
        <header className="results-page__header">
          <h1>Attempt Results (Admin)</h1>
          <p>Attempt {attemptId}</p>
        </header>

        <div className="results-form__actions">
          <Button type="button" variant="secondary" onClick={() => void refreshAll()}>
            Refresh
          </Button>
        </div>

        {isLoading && <p>Loading results...</p>}

        {!isLoading && error && (
          <p className="results-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && result && <ResultContent result={result} />}

        {showCertificateSection && (
          <CertificateLink
            state={certificateState}
            certificate={certificate}
            errorMessage={certificateError}
            canGenerate={canGenerate && certificateState === 'unavailable'}
            isGenerating={isGenerating}
            isRefreshing={isRefreshing}
            onDownload={handleDownload}
            onRefresh={() => void handleRefresh()}
            onGenerate={() => void handleGenerate()}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
