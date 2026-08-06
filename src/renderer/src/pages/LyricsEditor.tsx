import { useState, useEffect, useRef, useCallback } from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import LyricsRow from '../components/lyrics/LyricsRow'
import LyricsInputStep from '../components/lyrics/LyricsInputStep'
import SelectionHintLayer from '../components/lyrics/SelectionHintLayer'
import PixelButton from '../components/shared/PixelButton'
import FloatingAddButton from '../components/vocabulary/FloatingAddButton'
import AddWordModal from '../components/vocabulary/AddWordModal'
import ApiKeyModal from '../components/lyrics/ApiKeyModal'
import ErrorBanner from '../components/shared/ErrorBanner'
import { LyricLine, Song } from '../types'
import { addVocabWord } from '../lib/vocab'
import './LyricsEditor.css'

interface Props {
  editingSong: { song: Song; lines: LyricLine[] } | null
  onSaved: (songId: number) => void
  currentSongId: number | null
  setCurrentSongId: (id: number | null) => void
  onWordAdded?: () => void
  onNoteAdded?: () => void
  onExit?: () => void
}

type Step = 'input' | 'translate'
type ReadingMode = 'hiragana' | 'korean'

type WordModalState = {
  initialWord: string
  initialReading?: string
  selectedWord?: string
  lemmaSuggested?: boolean
}

const WORD_SHORTCUT_TIP_KEY = 'jpop-lyrics-word-shortcut-tip-seen'

export default function LyricsEditor({ editingSong, onSaved, currentSongId, setCurrentSongId, onWordAdded, onNoteAdded, onExit }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(editingSong ? 'translate' : 'input')
  const [title, setTitle] = useState(editingSong?.song.title ?? '')
  const [artist, setArtist] = useState(editingSong?.song.artist ?? '')
  const [rawLyrics, setRawLyrics] = useState('')
  const [lines, setLines] = useState<LyricLine[]>(editingSong?.lines ?? [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wordModal, setWordModal] = useState<WordModalState | null>(null)
  const [showShortcutToast, setShowShortcutToast] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>('hiragana')
  const [convertingKorean, setConvertingKorean] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirtyVersionRef = useRef(0)
  const wordModalRequestRef = useRef(0)

  const markUnsaved = useCallback(() => {
    dirtyVersionRef.current += 1
    setSaved(false)
    // 편집을 재개하면 오류 표시를 지우고 자동 저장도 다시 동작하게 한다
    setError(null)
  }, [])

  const handleAddWord = useCallback(async (word: string, reading: string, meaning: string) => {
    await addVocabWord({ songId: currentSongId, word, reading, meaning })
    onWordAdded?.()
  }, [currentSongId, onWordAdded])

  const openWordModal = useCallback((word = '') => {
    const requestId = ++wordModalRequestRef.current
    const trimmed = word.trim()
    if (!trimmed) {
      setWordModal({ initialWord: '' })
      return
    }
    // 활용형이면 기본형을 추천받아 모달에 전달, 실패 시 원문 그대로 진행
    window.api.japanese
      .recommendLemma(trimmed)
      .then((rec) => {
        if (wordModalRequestRef.current !== requestId) return
        if (rec.suggested) {
          setWordModal({
            initialWord: rec.lemma,
            initialReading: rec.reading || undefined,
            selectedWord: rec.selected,
            lemmaSuggested: true
          })
        } else {
          setWordModal({ initialWord: trimmed })
        }
      })
      .catch(() => {
        if (wordModalRequestRef.current !== requestId) return
        setWordModal({ initialWord: trimmed })
      })
  }, [])

  const closeWordModal = useCallback(() => {
    // 진행 중인 추천 요청이 닫힌 모달을 다시 열지 않게 무효화
    wordModalRequestRef.current += 1
    setWordModal(null)
  }, [])

  useEffect(() => {
    if (step !== 'translate') return

    try {
      if (window.localStorage.getItem(WORD_SHORTCUT_TIP_KEY)) return
      window.localStorage.setItem(WORD_SHORTCUT_TIP_KEY, '1')
    } catch {
      // Ignore storage failures; the tip can still appear for this session.
    }

    setShowShortcutToast(true)
    const timerId = window.setTimeout(() => setShowShortcutToast(false), 4500)
    return () => window.clearTimeout(timerId)
  }, [step])

  const generateKoreanReadings = useCallback(async () => {
    setConvertingKorean(true)
    setError(null)
    try {
      const originals = lines.map((l) => l.original)
      const koReadings = await window.api.anthropic.convertKorean(originals)
      const updatedLines = lines.map((l, i) => ({ ...l, reading_ko: koReadings[i] ?? '' }))
      setLines(updatedLines)
      setReadingMode('korean')
      const songId = currentSongId
      if (songId) {
        await window.api.songs.saveKoreanReadings({ songId, readings: koReadings })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.'
      setError(msg)
    } finally {
      setConvertingKorean(false)
    }
  }, [lines, currentSongId])

  const handleToggleReading = useCallback(async () => {
    if (readingMode === 'korean') {
      setReadingMode('hiragana')
      return
    }
    // reading_ko가 실제 한글 문자를 포함할 때만 캐시 사용
    const hasValidKorean = (text: string | undefined) => !!text && /[가-힣ᄀ-ᇿ㄰-㆏]/.test(text)
    if (lines.length > 0 && lines.every((l) => hasValidKorean(l.reading_ko))) {
      setReadingMode('korean')
      return
    }
    // API 키 확인 후 변환
    const hasKey = await window.api.anthropic.hasKey()
    if (!hasKey) {
      setShowApiKeyModal(true)
      return
    }
    await generateKoreanReadings()
  }, [readingMode, lines, generateKoreanReadings])

  const handleApiKeySubmit = useCallback(async (key: string) => {
    await window.api.anthropic.setKey(key)
    setShowApiKeyModal(false)
    await generateKoreanReadings()
  }, [generateKoreanReadings])

  const handleGenerate = useCallback(async () => {
    if (!rawLyrics.trim()) return
    setLoading(true)
    setError(null)
    try {
      const originals = rawLyrics
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const kuroshiroStatus = await window.api.kuroshiroStatus()
      const readings = await window.api.convertReadingBulk(originals)
      const newLines: LyricLine[] = originals.map((original, i) => ({
        line_index: i,
        original,
        reading: readings[i] ?? original,
        translation: ''
      }))
      setLines(newLines)

      const existingId = currentSongId ?? editingSong?.song.id
      const id = await window.api.songs.save({
        id: existingId,
        title: title.trim() || '제목 없음',
        artist: artist.trim(),
        lines: newLines
      })
      setCurrentSongId(id)
      setSaved(true)
      onSaved(id)

      if (!kuroshiroStatus.ready) {
        setError('히라가나 자동 변환 사전을 불러오지 못했어요. 발음(읽기)은 직접 입력해 주세요.')
      }
      setStep('translate')
    } catch (err) {
      setError(err instanceof Error ? err.message : '가사 변환/저장 중 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }, [rawLyrics, title, artist, currentSongId, editingSong, setCurrentSongId, onSaved])

  const handleLineChange = useCallback((index: number, field: 'original' | 'reading' | 'reading_ko' | 'translation', value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.line_index === index ? { ...l, [field]: value } : l))
    )
    markUnsaved()
  }, [markUnsaved])

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    const saveVersion = dirtyVersionRef.current
    setSaving(true)
    try {
      const existingId = currentSongId ?? editingSong?.song.id
      const id = await window.api.songs.save({
        id: existingId,
        title: title.trim(),
        artist: artist.trim(),
        lines
      })
      setCurrentSongId(id)
      if (dirtyVersionRef.current === saveVersion) {
        setSaved(true)
      }
      onSaved(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했어요.')
    } finally {
      setSaving(false)
    }
  }, [title, artist, lines, editingSong, currentSongId, onSaved, setCurrentSongId])

  useEffect(() => {
    // error가 있으면 자동 저장을 멈춘다 — 실패 시 1초마다 무한 재시도 방지
    // (markUnsaved에서 error를 지우므로 편집을 재개하면 자동 저장도 재개됨)
    if (step !== 'translate' || saved || saving || error !== null || !title.trim() || lines.length === 0) return

    const timerId = window.setTimeout(() => {
      void handleSave()
    }, 1000)

    return () => window.clearTimeout(timerId)
  }, [step, saved, saving, error, title, artist, lines, handleSave])

  const handleExit = useCallback(() => {
    // 저장 안 된 편집이 있으면 저장을 걸어두고 목록으로 — IPC는 이동 후에도 완료됨
    if (!saved && title.trim() && lines.length > 0) void handleSave()
    onExit?.()
  }, [saved, title, lines, handleSave, onExit])

  const handleReset = useCallback(() => {
    setStep('input')
    setTitle('')
    setArtist('')
    setRawLyrics('')
    setLines([])
    setSaved(false)
    setReadingMode('hiragana')
    setError(null)
  }, [])

  return (
    <div className="lyrics-editor">
      {step === 'input' ? (
        <LyricsInputStep
          title={title}
          artist={artist}
          rawLyrics={rawLyrics}
          loading={loading}
          error={error}
          onTitleChange={setTitle}
          onArtistChange={setArtist}
          onRawLyricsChange={setRawLyrics}
          onDismissError={() => setError(null)}
          onGenerate={handleGenerate}
        />
      ) : (
        <div className="editor-translate-layout">
          {showShortcutToast && (
            <div className="editor-shortcut-toast">
              팁: 단어를 드래그하고 Ctrl+E를 누르면 바로 단어장에 추가돼요
            </div>
          )}
          <SelectionHintLayer
            active={step === 'translate' && !wordModal}
            onAddWord={openWordModal}
          />
          <RetroWindow
            title={`${title}${artist ? ` — ${artist}` : ''}`}
            icon="♪"
            accent="lavender"
            className="editor-translate-window"
            onClose={handleExit}
          >
            <div className="editor-translate-header">
              <div className="editor-translate-meta">
                <input
                  className="editor-meta-input editor-meta-input--title jp-text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markUnsaved() }}
                  placeholder="노래 제목"
                  aria-label="노래 제목"
                />
                <input
                  className="editor-meta-input editor-meta-input--artist"
                  value={artist}
                  onChange={(e) => { setArtist(e.target.value); markUnsaved() }}
                  placeholder="아티스트"
                  aria-label="아티스트"
                />
              </div>
              <div className="editor-translate-actions">
                <PixelButton
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleReading}
                  disabled={convertingKorean}
                  className={readingMode === 'korean' ? 'reading-toggle--korean' : ''}
                >
                  {convertingKorean ? '변환 중...' : readingMode === 'hiragana' ? 'ひ → 가' : '가 → ひ'}
                </PixelButton>
                <PixelButton variant="ghost" size="sm" onClick={handleReset}>
                  ← 새로 입력
                </PixelButton>
                <PixelButton
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '저장 중...' : saved ? '✓ 저장됨' : '💾 저장'}
                </PixelButton>
              </div>
            </div>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <div className="editor-translate-lines">
              {lines.map((line) => (
                <LyricsRow
                  key={line.line_index}
                  line={line}
                  readingMode={readingMode}
                  onChange={handleLineChange}
                  onWordAdded={onWordAdded}
                  onNoteAdded={onNoteAdded}
                />
              ))}
            </div>
          </RetroWindow>

          <FloatingAddButton onClick={() => openWordModal()} />
          {wordModal && (
            <AddWordModal
              songId={currentSongId}
              songTitle={title || undefined}
              initialWord={wordModal.initialWord}
              initialReading={wordModal.initialReading}
              selectedWord={wordModal.selectedWord}
              lemmaSuggested={wordModal.lemmaSuggested}
              onAdd={handleAddWord}
              onClose={closeWordModal}
            />
          )}
          {showApiKeyModal && (
            <ApiKeyModal
              onSubmit={handleApiKeySubmit}
              onClose={() => setShowApiKeyModal(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
