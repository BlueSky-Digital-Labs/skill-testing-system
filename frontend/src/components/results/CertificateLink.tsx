import { Button } from '@components/atoms/Button'
import type { CertificateDto } from '@/api/results'

export type CertificateLinkState =
  | 'loading'
  | 'available'
  | 'unavailable'
  | 'error'
  | 'expired'

interface CertificateLinkProps {
  state: CertificateLinkState
  certificate?: CertificateDto | null
  errorMessage?: string | null
  canGenerate?: boolean
  isGenerating?: boolean
  isRefreshing?: boolean
  onDownload?: () => void
  onRefresh?: () => void
  onGenerate?: () => void
}

export function CertificateLink({
  state,
  certificate,
  errorMessage,
  canGenerate = false,
  isGenerating = false,
  isRefreshing = false,
  onDownload,
  onRefresh,
  onGenerate,
}: CertificateLinkProps) {
  return (
    <section className="results-panel results-certificate" aria-label="Certificate">
      <h2 className="results-panel__title">Certificate</h2>

      {state === 'loading' && (
        <p className="results-empty-state">Checking certificate availability...</p>
      )}

      {state === 'unavailable' && (
        <p className="results-empty-state">
          No certificate is available for this attempt yet.
        </p>
      )}

      {state === 'error' && errorMessage && (
        <p className="results-error" role="alert">
          {errorMessage}
        </p>
      )}

      {state === 'expired' && (
        <div className="results-certificate__message">
          <p className="results-empty-state">
            Your download link has expired. Refresh to generate a new link.
          </p>
          {onRefresh && (
            <Button
              type="button"
              variant="secondary"
              onClick={onRefresh}
              isLoading={isRefreshing}
            >
              Refresh download link
            </Button>
          )}
        </div>
      )}

      {state === 'available' && certificate && (
        <div className="results-certificate__details">
          <dl className="results-certificate__meta">
            <div>
              <dt>Issued</dt>
              <dd>{new Date(certificate.issued_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{certificate.template_version}</dd>
            </div>
            <div>
              <dt>Checksum</dt>
              <dd className="results-certificate__checksum">{certificate.checksum_sha256}</dd>
            </div>
          </dl>

          <div className="results-form__actions">
            {certificate.url ? (
              <Button
                type="button"
                onClick={onDownload}
                disabled={isRefreshing}
              >
                Download certificate
              </Button>
            ) : (
              <p className="results-empty-state">
                Download link is not available. Try refreshing.
              </p>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="secondary"
                onClick={onRefresh}
                isLoading={isRefreshing}
              >
                Refresh download link
              </Button>
            )}
          </div>

          <p className="results-certificate__hint">
            Download links expire after a limited time. Use refresh if your link stops working.
          </p>
        </div>
      )}

      {canGenerate && onGenerate && state !== 'available' && state !== 'loading' && (
        <div className="results-form__actions">
          <Button type="button" onClick={onGenerate} isLoading={isGenerating}>
            Generate certificate
          </Button>
        </div>
      )}
    </section>
  )
}
