import React from 'react'
import './RetroWindow.css'

interface Props {
  title: string
  icon?: string
  accent?: 'pink' | 'lavender' | 'blue'
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClose?: () => void
}

export default function RetroWindow({
  title,
  icon = '♪',
  accent = 'pink',
  children,
  className = '',
  style,
  onClose
}: Props): JSX.Element {
  return (
    <div className={`retro-window ${className}`} style={style}>
      <div className={`retro-titlebar accent-${accent}`}>
        <span className="retro-titlebar__icon">{icon}</span>
        <span className="retro-titlebar__title">{title}</span>
        <div className="retro-titlebar__controls">
          <span className="retro-titlebar__btn btn-min">─</span>
          <span className="retro-titlebar__btn btn-max">□</span>
          <span
            className="retro-titlebar__btn btn-close"
            onClick={onClose}
            style={{ cursor: onClose ? 'pointer' : 'default' }}
          >
            ×
          </span>
        </div>
      </div>
      <div className="retro-window__body">{children}</div>
    </div>
  )
}
