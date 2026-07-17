import PixelButton from './PixelButton'
import './ErrorBanner.css'

interface Props {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export default function ErrorBanner({ message, onRetry, onDismiss }: Props): JSX.Element {
  return (
    <div className="error-banner">
      <span className="error-banner__message">⚠ {message}</span>
      <div className="error-banner__actions">
        {onRetry && (
          <PixelButton variant="ghost" size="sm" onClick={onRetry}>
            다시 시도
          </PixelButton>
        )}
        {onDismiss && (
          <button
            className="error-banner__dismiss"
            onClick={onDismiss}
            title="닫기"
            aria-label="오류 메시지 닫기"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
