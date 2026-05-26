import React, { useState, useEffect } from 'react'
import PixelButton from '../shared/PixelButton'
import PixelInput from '../shared/PixelInput'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './AddWordModal.css'

interface Props {
  songId: number | null
  songTitle?: string
  initialWord?: string
  initialReading?: string
  initialMeaning?: string
  onAdd: (word: string, reading: string, meaning: string) => Promise<void>
  onClose: () => void
}

const JAPANESE_RE = /[ぁ-鿿＀-ﾟ]/
function isJapanese(text: string): boolean {
  return JAPANESE_RE.test(text)
}

export default function AddWordModal({
  songId: _songId,
  songTitle,
  initialWord = '',
  initialReading,
  initialMeaning,
  onAdd,
  onClose
}: Props): JSX.Element {
  const isEditing = initialMeaning !== undefined

  const [word, setWord] = useState(initialWord)
  const [reading, setReading] = useState(initialReading ?? '')
  const [meaning, setMeaning] = useState(initialMeaning ?? '')
  const [meaningHint, setMeaningHint] = useState('')
  const [loadingReading, setLoadingReading] = useState(false)
  const [loadingMeaning, setLoadingMeaning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setWord(initialWord)
    setReading(initialReading ?? '')
    setMeaning(initialMeaning ?? '')
    setMeaningHint('')

    if (isEditing) return
    if (!initialWord || !isJapanese(initialWord)) return

    let cancelled = false

    setLoadingReading(true)
    window.api.convertReadingBulk([initialWord])
      .then(([r]) => { if (!cancelled) setReading((prev) => prev === '' ? (r ?? '') : prev) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingReading(false) })

    window.api.anthropic.hasKey().then((hasKey) => {
      if (!hasKey || cancelled) return
      setLoadingMeaning(true)
      window.api.anthropic.translateWord(initialWord)
        .then((r) => {
          if (cancelled) return
          setMeaning((prev) => prev === '' ? r : prev)
          if (!r) setMeaningHint('정확한 단어를 선택해 주세요')
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoadingMeaning(false) })
    })

    return () => { cancelled = true }
  }, [initialWord, initialReading, initialMeaning])

  useEscapeKey(onClose)

  const handleSubmit = async () => {
    if (!word.trim() || !meaning.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      await onAdd(word.trim(), reading.trim(), meaning.trim())
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했어요. 앱을 재시작해 보세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titlebar">
          <span className="modal-titlebar__icon">{isEditing ? '✎' : '★'}</span>
          <span className="modal-titlebar__title">{isEditing ? '단어 수정' : '단어장에 추가'}</span>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {songTitle && (
            <div className="modal-song-tag">
              <span className="modal-song-tag__icon">♪</span>
              <span>{songTitle}</span>
            </div>
          )}
          <PixelInput
            label="일본어 단어"
            placeholder="예) 夜明け"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ fontFamily: 'var(--font-jp)' }}
          />
          <PixelInput
            label={loadingReading ? '읽기 (변환 중...)' : '읽기 (히라가나)'}
            placeholder="예) よあけ"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ fontFamily: 'var(--font-jp)', opacity: loadingReading ? 0.6 : 1 }}
          />
          <div className="modal-meaning-wrap">
            <PixelInput
              label={loadingMeaning ? '뜻 (AI 번역 중...)' : '뜻'}
              placeholder="예) 새벽, 동이 틈"
              value={meaning}
              onChange={(e) => { setMeaning(e.target.value); setMeaningHint('') }}
              onKeyDown={handleKeyDown}
              style={{ opacity: loadingMeaning ? 0.6 : 1 }}
            />
            {meaningHint && (
              <div className="modal-meaning-hint">{meaningHint}</div>
            )}
          </div>
          {saveError && (
            <div className="modal-save-error">{saveError}</div>
          )}
          <div className="modal-actions">
            <PixelButton variant="ghost" size="sm" onClick={onClose}>
              취소
            </PixelButton>
            <PixelButton
              variant="secondary"
              size="sm"
              onClick={handleSubmit}
              disabled={!word.trim() || !meaning.trim() || saving}
            >
              {saving ? '저장 중...' : isEditing ? '✎ 저장' : '★ 저장'}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  )
}
