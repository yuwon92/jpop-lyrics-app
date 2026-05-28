import React from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import { Theme } from '../hooks/useTheme'
import './Settings.css'

interface Props {
  theme: Theme
  onChangeTheme: (t: Theme) => void
}

const THEMES: { id: Theme; label: string; desc: string; swatches: string[] }[] = [
  {
    id: 'pastel',
    label: '파스텔',
    desc: '핑크 & 라벤더',
    swatches: ['#F8DDEB', '#E7D8FF', '#BBA7FF', '#F6A6C8']
  },
  {
    id: 'white',
    label: '화이트',
    desc: '깔끔한 라이트',
    swatches: ['#FFFFFF', '#F6F6F6', '#4A4A4A', '#2F2F2F']
  },
  {
    id: 'dark',
    label: '다크',
    desc: '깔끔한 다크',
    swatches: ['#0F1115', '#171A21', '#4A5160', '#3A3F4A']
  }
]

export default function Settings({ theme, onChangeTheme }: Props): JSX.Element {
  return (
    <div className="settings-page">
      <RetroWindow title="설정" icon="⚙" accent="lavender" className="settings-window">
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section__title">컬러 테마</div>
            <div className="settings-theme-list">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`settings-theme-card ${theme === t.id ? 'selected' : ''}`}
                  onClick={() => onChangeTheme(t.id)}
                >
                  <div className="settings-theme-card__swatches">
                    {t.swatches.map((color, i) => (
                      <div
                        key={i}
                        className="settings-theme-card__swatch"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="settings-theme-card__info">
                    <span className="settings-theme-card__label">{t.label}</span>
                    <span className="settings-theme-card__desc">{t.desc}</span>
                  </div>
                  {theme === t.id && <span className="settings-theme-card__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </RetroWindow>
    </div>
  )
}
