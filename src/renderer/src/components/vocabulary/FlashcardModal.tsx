import React, { useState, useEffect, useCallback } from 'react'
import { VocabWord } from '../../types'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './FlashcardModal.css'

interface Props {
  words: VocabWord[]
  onToggleFavorite: (id: number) => void
  onClose: () => void
}

export default function FlashcardModal({ words, onToggleFavorite, onClose }: Props): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const current = words[currentIndex]
  const total = words.length

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, total])

  const flip = useCallback(() => setIsFlipped((f) => !f), [])

  useEscapeKey(onClose)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === ' ') { e.preventDefault(); flip() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goPrev, goNext, flip])

  if (total === 0) {
    return (
      <div className="flashcard-overlay" onClick={onClose}>
        <div className="flashcard-panel" onClick={(e) => e.stopPropagation()}>
          <div className="flashcard-titlebar">
            <span className="flashcard-titlebar__icon">🃏</span>
            <span className="flashcard-titlebar__title">낱말카드</span>
            <button className="flashcard-close-btn" onClick={onClose}>×</button>
          </div>
          <div className="flashcard-empty">단어가 없어요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard-overlay" onClick={onClose}>
      <div className="flashcard-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flashcard-titlebar">
          <span className="flashcard-titlebar__icon">🃏</span>
          <span className="flashcard-titlebar__title">낱말카드</span>
          <span className="flashcard-titlebar__count">{currentIndex + 1} / {total}</span>
          <button className="flashcard-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="flashcard-stage" onClick={flip}>
          <div className={`flashcard-card ${isFlipped ? 'flipped' : ''}`}>
            <div className="flashcard-front">
              <div className="flashcard-word jp-text">{current.word}</div>
              <div className="flashcard-hint">클릭하여 뒤집기</div>
            </div>
            <div className="flashcard-back">
              <div className="flashcard-word-sm jp-text">{current.word}</div>
              {current.reading && current.reading !== current.word && (
                <div className="flashcard-reading jp-text">{current.reading}</div>
              )}
              <div className="flashcard-meaning">{current.meaning}</div>
            </div>
          </div>
        </div>

        <div className="flashcard-nav">
          <button
            className="flashcard-nav-btn"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            ← 이전
          </button>
          <button
            className={`flashcard-fav-btn ${current.favorited ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(current.id)}
            title={current.favorited ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {current.favorited ? '★' : '☆'} 즐겨찾기
          </button>
          <button
            className="flashcard-nav-btn"
            onClick={goNext}
            disabled={currentIndex === total - 1}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  )
}
