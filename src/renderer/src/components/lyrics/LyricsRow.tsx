import React from 'react'
import { LyricLine } from '../../types'
import './LyricsRow.css'

interface Props {
  line: LyricLine
  onChange: (field: 'original' | 'reading' | 'translation', value: string) => void
}

export default function LyricsRow({ line, onChange }: Props): JSX.Element {
  return (
    <div className="lyrics-row">
      <div className="lyrics-row__index">{line.line_index + 1}</div>
      <div className="lyrics-row__content">
        <input
          className="lyrics-row__original jp-text"
          value={line.original}
          onChange={(e) => onChange('original', e.target.value)}
          placeholder="일본어 가사"
        />
        <input
          className="lyrics-row__reading jp-text"
          value={line.reading}
          onChange={(e) => onChange('reading', e.target.value)}
          placeholder="히라가나"
        />
        <textarea
          className="lyrics-row__translation"
          value={line.translation}
          onChange={(e) => onChange('translation', e.target.value)}
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
