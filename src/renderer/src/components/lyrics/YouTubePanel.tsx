import { useState } from 'react'
import RetroWindow from '../layout/RetroWindow'
import './YouTubePanel.css'

interface Props {
  url: string
  onUrlChange: (url: string) => void
}

const COLLAPSE_KEY = 'jpop-lyrics-youtube-panel-collapsed'

/** watch?v= · youtu.be · shorts · live · embed · 순수 11자 ID 형태를 모두 지원 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^(www|m|music)\./, '')
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return /^[\w-]{11}$/.test(id) ? id : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = parsed.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
    const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)
    if (pathMatch) return pathMatch[1]
  }
  return null
}

export default function YouTubePanel({ url, onUrlChange }: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = (): void => {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1')
      } catch {
        // 저장 실패해도 이번 세션 동안은 동작
      }
      return !prev
    })
  }

  const videoId = extractYouTubeVideoId(url)

  // 접어도 iframe을 언마운트하지 않고 CSS로만 숨겨 재생이 끊기지 않게 한다
  return (
    <>
      {collapsed && (
        <button
          type="button"
          className="youtube-panel-collapsed"
          onClick={toggleCollapsed}
          title="유튜브 플레이어 열기"
          aria-label="유튜브 플레이어 열기"
        >
          <span className="youtube-panel-collapsed__icon">♫</span>
          <span className="youtube-panel-collapsed__label">MUSIC</span>
        </button>
      )}
      <RetroWindow
        title="MUSIC PLAYER"
        icon="♫"
        accent="blue"
        className={`youtube-panel${collapsed ? ' youtube-panel--hidden' : ''}`}
        onClose={toggleCollapsed}
      >
        <div className="youtube-panel__body">
          <input
            className="youtube-panel__url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="유튜브 URL 붙여넣기"
            aria-label="유튜브 URL"
            spellCheck={false}
          />
          {videoId ? (
            <div className="youtube-panel__player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="YouTube 플레이어"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : url.trim() ? (
            <div className="youtube-panel__empty">
              유튜브 링크를 인식하지 못했어요.
              <br />
              영상 페이지 주소를 그대로 붙여넣어 주세요.
            </div>
          ) : (
            <div className="youtube-panel__empty">
              유튜브 URL을 붙여넣으면
              <br />
              노래를 들으며 공부할 수 있어요 ♪
            </div>
          )}
        </div>
      </RetroWindow>
    </>
  )
}
