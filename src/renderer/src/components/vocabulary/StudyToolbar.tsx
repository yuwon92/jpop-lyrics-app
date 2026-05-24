import React from 'react'
import './StudyToolbar.css'

interface Props {
  showFavOnly: boolean
  isShuffled: boolean
  onFlashcard: () => void
  onToggleShuffle: () => void
  onToggleFavOnly: () => void
  disabled?: boolean
}

export default function StudyToolbar({
  showFavOnly,
  isShuffled,
  onFlashcard,
  onToggleShuffle,
  onToggleFavOnly,
  disabled
}: Props): JSX.Element {
  return (
    <div className="study-toolbar">
      <button
        className="study-btn"
        onClick={onFlashcard}
        disabled={disabled}
        title="낱말카드 모드"
      >
        <span className="study-btn__icon">🃏</span>
        <span className="study-btn__label">낱말카드</span>
      </button>
      <button
        className={`study-btn ${isShuffled ? 'active' : ''}`}
        onClick={onToggleShuffle}
        disabled={disabled}
        title="셔플"
      >
        <span className="study-btn__icon">🔀</span>
        <span className="study-btn__label">셔플</span>
      </button>
      <button
        className={`study-btn ${showFavOnly ? 'active' : ''}`}
        onClick={onToggleFavOnly}
        disabled={disabled}
        title="즐겨찾기만 보기"
      >
        <span className="study-btn__icon">{showFavOnly ? '★' : '☆'}</span>
        <span className="study-btn__label">즐겨찾기만</span>
      </button>
    </div>
  )
}
