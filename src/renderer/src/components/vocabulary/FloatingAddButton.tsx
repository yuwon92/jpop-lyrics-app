import React from 'react'
import './FloatingAddButton.css'

interface Props {
  onClick: () => void
}

export default function FloatingAddButton({ onClick }: Props): JSX.Element {
  return (
    <button className="floating-add-btn" onClick={onClick} title="단어 추가">
      <span className="floating-add-btn__icon">+</span>
      <span className="floating-add-btn__label">단어 추가</span>
    </button>
  )
}
