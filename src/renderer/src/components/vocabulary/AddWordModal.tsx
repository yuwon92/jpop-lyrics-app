import React, { useState, useEffect } from 'react'
import PixelButton from '../shared/PixelButton'
import PixelInput from '../shared/PixelInput'
import './AddWordModal.css'

interface Props {
  songId: number | null
  songTitle?: string
  initialWord?: string
  onAdd: (word: string, meaning: string) => Promise<void>
  onClose: () => void
}

export default function AddWordModal({ songId, songTitle, initialWord = '', onAdd, onClose }: Props): JSX.Element {
  const [word, setWord] = useState(initialWord)
  const [meaning, setMeaning] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setWord(initialWord)
  }, [initialWord])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async () => {
    if (!word.trim() || !meaning.trim()) return
    setSaving(true)
    try {
      await onAdd(word.trim(), meaning.trim())
      onClose()
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
          <span className="modal-titlebar__icon">★</span>
          <span className="modal-titlebar__title">단어장에 추가</span>
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
            label="뜻"
            placeholder="예) 새벽, 동이 틈"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            onKeyDown={handleKeyDown}
          />
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
              {saving ? '저장 중...' : '★ 저장'}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  )
}
