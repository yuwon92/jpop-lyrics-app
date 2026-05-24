import React from 'react'
import { Page } from '../../types'
import './MenuBar.css'

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const tabs: { id: Page; label: string; icon: string }[] = [
  { id: 'home',       label: '노래 목록', icon: '♫' },
  { id: 'editor',     label: '가사 번역', icon: '✏' },
  { id: 'vocabulary', label: '단어장',   icon: '★' }
]

export default function MenuBar({ currentPage, onNavigate }: Props): JSX.Element {
  return (
    <header className="menubar">
      <div className="menubar__brand">
        <span className="menubar__logo">✿</span>
        <span className="menubar__title">J-Pop 가사 번역</span>
      </div>
      <nav className="menubar__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`menubar__tab ${currentPage === tab.id ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <span className="menubar__tab-icon">{tab.icon}</span>
            <span className="menubar__tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="menubar__deco">
        <span>♡</span>
        <span>·</span>
        <span>☆</span>
        <span>·</span>
        <span>♡</span>
      </div>
    </header>
  )
}
