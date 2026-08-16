import { useCallback, useEffect, useState } from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import PixelButton from '../components/shared/PixelButton'
import ApiKeyModal from '../components/lyrics/ApiKeyModal'
import { Theme } from '../hooks/useTheme'
import './Settings.css'

interface Props {
  theme: Theme
  onChangeTheme: (t: Theme) => void
  onClose?: () => void
}

const THEMES: { id: Theme; label: string; desc: string; swatches: string[] }[] = [
  {
    id: 'pastel',
    label: '파스텔',
    desc: '핑크 & 라벤더',
    swatches: ['#F8DDEB', '#E7D8FF', '#BBA7FF', '#F6A6C8']
  },
  {
    id: 'white',
    label: '화이트',
    desc: '라이트 & 옐로 포인트',
    swatches: ['#FFFFFF', '#F6F6F6', '#FFE08A', '#F6D35C']
  },
  {
    id: 'dark',
    label: '다크',
    desc: '깔끔한 다크',
    swatches: ['#0F1115', '#171A21', '#4A5160', '#3A3F4A']
  }
]

export default function Settings({ theme, onChangeTheme, onClose }: Props): JSX.Element {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  useEffect(() => {
    window.api.anthropic
      .hasKey()
      .then(setHasKey)
      .catch(() => setHasKey(false))
  }, [])

  const handleSaveKey = useCallback(async (key: string) => {
    try {
      await window.api.anthropic.setKey(key)
      setHasKey(true)
      setKeyError(null)
      setShowKeyModal(false)
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'API 키를 저장하지 못했습니다.')
    }
  }, [])

  const handleDeleteKey = useCallback(async () => {
    if (!window.confirm('저장된 API 키를 삭제할까요?\n삭제하면 발음 변환·가사 분석 기능을 사용할 수 없어요.')) {
      return
    }
    try {
      await window.api.anthropic.deleteKey()
      setHasKey(false)
      setKeyError(null)
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'API 키를 삭제하지 못했습니다.')
    }
  }, [])

  return (
    <div className="settings-page">
      <RetroWindow title="설정" icon="⚙" accent="lavender" className="settings-window" onClose={onClose}>
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section__title">컬러 테마</div>
            <div className="settings-theme-list">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`settings-theme-card ${theme === t.id ? 'selected' : ''}`}
                  onClick={() => onChangeTheme(t.id)}
                >
                  <div className="settings-theme-card__swatches">
                    {t.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="settings-theme-card__swatch"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="settings-theme-card__info">
                    <span className="settings-theme-card__label">{t.label}</span>
                    <span className="settings-theme-card__desc">{t.desc}</span>
                  </div>
                  {theme === t.id && <span className="settings-theme-card__check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section__title">Anthropic API 키</div>
            <div className="settings-apikey-card">
              <div className="settings-apikey-card__info">
                <span className="settings-apikey-card__status">
                  {hasKey === null ? '확인 중...' : hasKey ? '● 등록됨' : '○ 등록 안 됨'}
                </span>
                <span className="settings-apikey-card__desc">
                  한글 발음 변환과 가사 분석에 사용돼요. 키는 이 기기에만 저장됩니다.
                </span>
              </div>
              <div className="settings-apikey-card__actions">
                <PixelButton variant="secondary" size="sm" onClick={() => setShowKeyModal(true)}>
                  {hasKey ? '변경' : '등록'}
                </PixelButton>
                {hasKey && (
                  <PixelButton variant="ghost" size="sm" onClick={handleDeleteKey}>
                    삭제
                  </PixelButton>
                )}
              </div>
            </div>
            {keyError && <div className="settings-apikey-error">⚠ {keyError}</div>}
          </div>
        </div>
      </RetroWindow>

      {showKeyModal && (
        <ApiKeyModal
          description={hasKey ? '새 API 키를 입력하면 기존 키를 대체해요.' : 'Anthropic API 키를 등록해 주세요.'}
          submitLabel="✦ 저장"
          onSubmit={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  )
}
