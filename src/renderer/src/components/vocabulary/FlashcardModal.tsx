import { useState, useEffect, useCallback } from 'react'
import Modal from '../shared/Modal'
import { VocabWord } from '../../types'
import { useSpeech } from '../../hooks/useSpeech'
import { stopSpeaking, TTS_UNAVAILABLE_HINT } from '../../lib/tts'
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
      stopSpeaking()
      setCurrentIndex((i) => i - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) {
      stopSpeaking()
      setCurrentIndex((i) => i + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, total])

  const flip = useCallback(() => setIsFlipped((f) => !f), [])

  const { speak, speaking, available } = useSpeech(
    current ? current.reading || current.word : ''
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === ' ') { e.preventDefault(); flip() }
      else if (e.key === 's' || e.key === 'S') {
        if (!e.repeat) { e.preventDefault(); speak() }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goPrev, goNext, flip, speak])

  // 모달을 닫을 때 재생 중인 발음도 함께 멈춘다
  useEffect(() => () => stopSpeaking(), [])

  if (total === 0) {
    return (
      <Modal
        title="낱말카드"
        icon="🃏"
        onClose={onClose}
        className="flashcard-panel"
        overlayClassName="flashcard-overlay"
      >
        <div className="flashcard-empty">단어가 없어요</div>
      </Modal>
    )
  }

  return (
    <Modal
      title="낱말카드"
      icon="🃏"
      onClose={onClose}
      className="flashcard-panel"
      overlayClassName="flashcard-overlay"
      titleExtra={
        <span className="flashcard-titlebar__count">{currentIndex + 1} / {total}</span>
      }
    >
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
          className={`flashcard-nav-btn flashcard-speak-btn${speaking ? ' speaking' : ''}`}
          onClick={() => {
            if (speaking) stopSpeaking()
            else speak()
          }}
          disabled={!available}
          title={available ? '발음 듣기 (S)' : TTS_UNAVAILABLE_HINT}
          aria-label={`'${current.word}' 발음 듣기`}
        >
          ♪ 발음
        </button>
        <button
          className={`flashcard-fav-btn ${current.favorited ? 'favorited' : ''}`}
          onClick={() => onToggleFavorite(current.id)}
          aria-pressed={current.favorited}
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
    </Modal>
  )
}
