import React from 'react'
import { LyricLine } from '../../types'
import './LyricsRow.css'

interface Props {
  line: LyricLine
  onChange: (translation: string) => void
}

export default function LyricsRow({ line, onChange }: Props): JSX.Element {
  return (
    <div className="lyrics-row">
      <div className="lyrics-row__index">{line.line_index + 1}</div>
      <div className="lyrics-row__content">
        <div className="lyrics-row__original jp-text">{line.original || ' '}</div>
        <div className="lyrics-row__reading jp-text">{line.reading || ' '}</div>
        <textarea
          className="lyrics-row__translation"
          value={line.translation}
          onChange={(e) => onChange(e.target.value)}
          placeholder="번역을 입력하세요..."
          rows={1}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
          }}
        />
      </div>
    </div>
  )
}
