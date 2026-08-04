import RetroWindow from '../layout/RetroWindow'
import PixelButton from '../shared/PixelButton'
import PixelInput from '../shared/PixelInput'
import ErrorBanner from '../shared/ErrorBanner'

interface Props {
  title: string
  artist: string
  rawLyrics: string
  loading: boolean
  error: string | null
  onTitleChange: (value: string) => void
  onArtistChange: (value: string) => void
  onRawLyricsChange: (value: string) => void
  onDismissError: () => void
  onGenerate: () => void
}

export default function LyricsInputStep({
  title,
  artist,
  rawLyrics,
  loading,
  error,
  onTitleChange,
  onArtistChange,
  onRawLyricsChange,
  onDismissError,
  onGenerate
}: Props): JSX.Element {
  return (
    <RetroWindow title="가사 입력" icon="✏" accent="pink" className="editor-input-window">
      <div className="editor-input-body">
        <div className="editor-meta-row">
          <PixelInput
            label="노래 제목"
            placeholder="예) 夜に駆ける"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{ flex: 2 }}
          />
          <PixelInput
            label="아티스트"
            placeholder="예) YOASOBI"
            value={artist}
            onChange={(e) => onArtistChange(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div className="editor-textarea-wrap">
          <label className="pixel-input-label" htmlFor="editor-raw-lyrics">
            일본어 가사 붙여넣기
          </label>
          <textarea
            id="editor-raw-lyrics"
            className="editor-textarea"
            placeholder={'가사를 한 줄씩 붙여넣으세요.\n예)\n夜に駆ける\n沈むように溶けてゆくように'}
            value={rawLyrics}
            onChange={(e) => onRawLyricsChange(e.target.value)}
          />
        </div>
        {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
        <div className="editor-actions">
          <PixelButton
            variant="primary"
            size="lg"
            onClick={onGenerate}
            disabled={!rawLyrics.trim() || !title.trim() || loading}
          >
            {loading ? '변환 중...' : '✦ 히라가나 자동 생성'}
          </PixelButton>
        </div>
      </div>
    </RetroWindow>
  )
}
