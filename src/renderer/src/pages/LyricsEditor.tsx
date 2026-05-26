import React, { useState, useEffect, useRef, useCallback } from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import LyricsRow from '../components/lyrics/LyricsRow'
import PixelButton from '../components/shared/PixelButton'
import PixelInput from '../components/shared/PixelInput'
import FloatingAddButton from '../components/vocabulary/FloatingAddButton'
import AddWordModal from '../components/vocabulary/AddWordModal'
import ApiKeyModal from '../components/lyrics/ApiKeyModal'
import { LyricLine, Song } from '../types'
import './LyricsEditor.css'

interface Props {
  editingSong: { song: Song; lines: LyricLine[] } | null
  onSaved: (songId: number) => void
  currentSongId: number | null
  setCurrentSongId: (id: number | null) => void
  onWordAdded?: () => void
}

type Step = 'input' | 'translate'
type ReadingMode = 'hiragana' | 'korean'
type SelectionHint = { x: number; y: number } | null

const WORD_SHORTCUT_TIP_KEY = 'jpop-lyrics-word-shortcut-tip-seen'

function getSelectedText(): string {
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start != null && end != null && end > start) {
      return active.value.slice(start, end).trim()
    }
  }
  return window.getSelection()?.toString().trim() ?? ''
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getSelectionHintPosition(): SelectionHint {
  const active = document.activeElement
  const hintWidth = 160

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start == null || end == null || end <= start) return null

    const rect = active.getBoundingClientRect()
    const x = clamp(rect.right - hintWidth, 8, window.innerWidth - hintWidth - 8)
    const aboveY = rect.top - 34
    const y = aboveY >= 8 ? aboveY : rect.bottom + 8
    return { x, y: clamp(y, 8, window.innerHeight - 40) }
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  const x = clamp(rect.left + rect.width / 2 - hintWidth / 2, 8, window.innerWidth - hintWidth - 8)
  const aboveY = rect.top - 34
  const y = aboveY >= 8 ? aboveY : rect.bottom + 8
  return { x, y: clamp(y, 8, window.innerHeight - 40) }
}

export default function LyricsEditor({ editingSong, onSaved, currentSongId, setCurrentSongId, onWordAdded }: Props): JSX.Element {
  const [step, setStep] = useState<Step>(editingSong ? 'translate' : 'input')
  const [title, setTitle] = useState(editingSong?.song.title ?? '')
  const [artist, setArtist] = useState(editingSong?.song.artist ?? '')
  const [rawLyrics, setRawLyrics] = useState('')
  const [lines, setLines] = useState<LyricLine[]>(editingSong?.lines ?? [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showWordModal, setShowWordModal] = useState(false)
  const [initialWord, setInitialWord] = useState('')
  const [showShortcutToast, setShowShortcutToast] = useState(false)
  const [selectionHint, setSelectionHint] = useState<SelectionHint>(null)
  const [readingMode, setReadingMode] = useState<ReadingMode>('hiragana')
  const [convertingKorean, setConvertingKorean] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [koreanError, setKoreanError] = useState<string | null>(null)
  const dirtyVersionRef = useRef(0)

  const markUnsaved = useCallback(() => {
    dirtyVersionRef.current += 1
    setSaved(false)
  }, [])

  const handleAddWord = useCallback(async (word: string, reading: string, meaning: string) => {
    await window.api.vocab.add({ song_id: currentSongId, word, reading: reading || undefined, meaning })
    onWordAdded?.()
  }, [currentSongId, onWordAdded])

  const openWordModal = useCallback((word = '') => {
    setInitialWord(word)
    setSelectionHint(null)
    setShowWordModal(true)
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

  useEffect(() => {
    if (step !== 'translate' || showWordModal) {
      setSelectionHint(null)
      return
    }

    const updateSelectionHint = () => {
      window.setTimeout(() => {
        if (!getSelectedText()) {
          setSelectionHint(null)
          return
        }
        setSelectionHint(getSelectionHintPosition())
      }, 0)
    }

    document.addEventListener('selectionchange', updateSelectionHint)
    window.addEventListener('mouseup', updateSelectionHint)
    window.addEventListener('keyup', updateSelectionHint)
    window.addEventListener('scroll', updateSelectionHint, true)

    return () => {
      document.removeEventListener('selectionchange', updateSelectionHint)
      window.removeEventListener('mouseup', updateSelectionHint)
      window.removeEventListener('keyup', updateSelectionHint)
      window.removeEventListener('scroll', updateSelectionHint, true)
    }
  }, [step, showWordModal])

  useEffect(() => {
    if (step !== 'translate' || showWordModal) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.key.toLowerCase() !== 'e') return

      const selectedText = getSelectedText()
      if (!selectedText) return

      e.preventDefault()
      openWordModal(selectedText)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, showWordModal, openWordModal])

  const generateKoreanReadings = useCallback(async () => {
    setConvertingKorean(true)
    setKoreanError(null)
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
      setKoreanError(msg)
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
    try {
      const originals = rawLyrics
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
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

      setStep('translate')
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
    } finally {
      setSaving(false)
    }
  }, [title, artist, lines, editingSong, currentSongId, onSaved, setCurrentSongId])

  useEffect(() => {
    if (step !== 'translate' || saved || saving || !title.trim() || lines.length === 0) return

    const timerId = window.setTimeout(() => {
      void handleSave()
    }, 1000)

    return () => window.clearTimeout(timerId)
  }, [step, saved, saving, title, artist, lines, handleSave])

  const handleReset = useCallback(() => {
    setStep('input')
    setTitle('')
    setArtist('')
    setRawLyrics('')
    setLines([])
    setSaved(false)
    setReadingMode('hiragana')
    setKoreanError(null)
  }, [])

  return (
    <div className="lyrics-editor">
      {step === 'input' ? (
        <RetroWindow title="가사 입력" icon="✏" accent="pink" className="editor-input-window">
          <div className="editor-input-body">
            <div className="editor-meta-row">
              <PixelInput
                label="노래 제목"
                placeholder="예) 夜に駆ける"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ flex: 2 }}
              />
              <PixelInput
                label="아티스트"
                placeholder="예) YOASOBI"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div className="editor-textarea-wrap">
              <label className="pixel-input-label">일본어 가사 붙여넣기</label>
              <textarea
                className="editor-textarea"
                placeholder={'가사를 한 줄씩 붙여넣으세요.\n예)\n夜に駆ける\n沈むように溶けてゆくように'}
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
              />
            </div>
            <div className="editor-actions">
              <PixelButton
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={!rawLyrics.trim() || !title.trim() || loading}
              >
                {loading ? '변환 중...' : '✦ 히라가나 자동 생성'}
              </PixelButton>
            </div>
          </div>
        </RetroWindow>
      ) : (
        <div className="editor-translate-layout">
          {showShortcutToast && (
            <div className="editor-shortcut-toast">
              팁: 단어를 드래그하고 Ctrl+E를 누르면 바로 단어장에 추가돼요
            </div>
          )}
          {selectionHint && (
            <div
              className="editor-selection-hint"
              style={{ left: selectionHint.x, top: selectionHint.y }}
            >
              Ctrl+E로 단어 추가
            </div>
          )}
          <RetroWindow
            title={`${title}${artist ? ` — ${artist}` : ''}`}
            icon="♪"
            accent="lavender"
            className="editor-translate-window"
          >
            <div className="editor-translate-header">
              <div className="editor-translate-meta">
                <input
                  className="editor-meta-input editor-meta-input--title jp-text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markUnsaved() }}
                  placeholder="노래 제목"
                />
                <input
                  className="editor-meta-input editor-meta-input--artist"
                  value={artist}
                  onChange={(e) => { setArtist(e.target.value); markUnsaved() }}
                  placeholder="아티스트"
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
            {koreanError && (
              <div className="editor-korean-error">
                ⚠ {koreanError}
              </div>
            )}
            <div className="editor-translate-lines">
              {lines.map((line) => (
                <LyricsRow
                  key={line.line_index}
                  line={line}
                  readingMode={readingMode}
                  onChange={(field, value) => handleLineChange(line.line_index, field, value)}
                />
              ))}
            </div>
          </RetroWindow>

          <FloatingAddButton onClick={() => openWordModal()} />
          {showWordModal && (
            <AddWordModal
              songId={currentSongId}
              songTitle={title || undefined}
              initialWord={initialWord}
              onAdd={handleAddWord}
              onClose={() => setShowWordModal(false)}
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
