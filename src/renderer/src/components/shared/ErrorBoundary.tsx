import React from 'react'
import RetroWindow from '../layout/RetroWindow'
import PixelButton from './PixelButton'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: 24
          }}
        >
          <RetroWindow title="오류 발생" icon="⚠" accent="pink" style={{ maxWidth: 480 }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p>예상치 못한 오류가 발생했어요.</p>
              <p style={{ fontSize: 12, opacity: 0.7, wordBreak: 'break-all' }}>
                {this.state.error.message}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <PixelButton
                  variant="primary"
                  size="sm"
                  onClick={() => this.setState({ error: null })}
                >
                  다시 시도
                </PixelButton>
                <PixelButton variant="ghost" size="sm" onClick={() => window.location.reload()}>
                  앱 새로고침
                </PixelButton>
              </div>
            </div>
          </RetroWindow>
        </div>
      )
    }
    return this.props.children
  }
}
