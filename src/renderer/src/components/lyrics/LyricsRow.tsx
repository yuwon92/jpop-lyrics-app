import React, { useState, useEffect, useRef } from 'react'
import { LyricLine, TranslateResult, GrammarResult } from '../../types'
import './LyricsRow.css'

interface Props {
  line: LyricLine
  readingMode: 'hiragana' | 'korean'
  onChange: (field: 'original' | 'reading' | 'reading_ko' | 'translation', value: string) => void
  onWordAdded?: () => void
}

export default function LyricsRow({ line, readingMode, onChange, onWordAdded }: Props): JSX.Element {
  const isKorean = readingMode === 'korean'

  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [translateResult, setTranslateResult] = useState<TranslateResult | null>(null)
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null)
  const [savedWords, setSavedWords] = useState<Set<number>>(new Set())

  const prevOriginalRef = useRef(line.original)
  useEffect(() => {
    if (prevOriginalRef.current !== line.original) {
      prevOriginalRef.current = line.original
      setTranslateResult(null)
      setGrammarResult(null)
      setPanelOpen(false)
    }
  }, [line.original])

  async function handleAnalyze(): Promise<void> {
    if (panelOpen) {
      setPanelOpen(false)
      return
    }
    setPanelOpen(true)
    if (translateResult && grammarResult) return

    setLoading(true)
    setError(null)
    try {
      const [tr, gr] = await Promise.all([
        window.api.anthropic.analyzeLine(line.original, 'translation'),
        window.api.anthropic.analyzeLine(line.original, 'grammar')
      ])
      setTranslateResult(tr as TranslateResult)
      setGrammarResult(gr as GrammarResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveWord(w: GrammarWord, idx: number): Promise<void> {
    if (savedWords.has(idx)) return
    await window.api.vocab.add({
      song_id: line.song_id ?? null,
      word: w.word,
      reading: w.reading || undefined,
      meaning: w.meaning
    })
    setSavedWords((prev) => new Set(prev).add(idx))
    onWordAdded?.()
  }

  const canAnalyze = line.original.trim().length > 0

  return (
    <div className="lyrics-row">
      <div className="lyrics-row__top">
        <div className="lyrics-row__index">{line.line_index + 1}</div>
        <div className="lyrics-row__content">
          <input
            className="lyrics-row__original jp-text"
            value={line.original}
            onChange={(e) => onChange('original', e.target.value)}
            placeholder="일본어 가사"
          />
          <input
            className={`lyrics-row__reading${isKorean ? ' lyrics-row__reading--korean' : ' jp-text'}`}
            value={isKorean ? (line.reading_ko ?? '') : line.reading}
            onChange={(e) => onChange(isKorean ? 'reading_ko' : 'reading', e.target.value)}
            placeholder={isKorean ? '한글 발음' : '히라가나'}
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
        {canAnalyze && (
          <button
            className={`lyrics-row__analyze-btn${panelOpen ? ' active' : ''}`}
            onClick={handleAnalyze}
            title="가사 분석"
          >
            ?
          </button>
        )}
      </div>

      {panelOpen && (
        <div className="lyrics-row__panel">
          {loading && <div className="lyrics-row__panel-loading">분석 중...</div>}
          {error && (
            <div className="lyrics-row__panel-error">
              {error === 'NO_API_KEY' ? 'API 키가 설정되지 않았습니다.' : error}
            </div>
          )}
          {!loading && !error && translateResult && grammarResult && (
            <>
              <div className="analysis-translate">
                <div className="analysis-translate__row">
                  <span className="analysis-translate__label">직역</span>
                  <span className="analysis-translate__text">{translateResult.literal}</span>
                </div>
                {translateResult.free && (
                  <div className="analysis-translate__row">
                    <span className="analysis-translate__label">의역</span>
                    <span className="analysis-translate__text">{translateResult.free}</span>
                  </div>
                )}
              </div>

              {grammarResult.words.length > 0 && (
                <div className="lyrics-row__panel-section">
                  <div className="lyrics-row__panel-section-title">단어</div>
                  <div className="analysis-words">
                    {grammarResult.words.map((w, i) => (
                      <div key={i} className="analysis-word-card">
                        <span className="analysis-word-card__word jp-text">{w.word}</span>
                        <span className="analysis-word-card__reading jp-text">{w.reading}</span>
                        <span className="analysis-word-card__meaning">{w.meaning}</span>
                        <div className="analysis-word-card__footer">
                          <span className="analysis-word-card__pos">{w.pos}</span>
                          <button
                            className={`analysis-word-card__save${savedWords.has(i) ? ' saved' : ''}`}
                            onClick={() => handleSaveWord(w, i)}
                            disabled={savedWords.has(i)}
                            title="단어장에 추가"
                          >
                            {savedWords.has(i) ? '✓' : '+'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {grammarResult.grammar.length > 0 && (
                <div className="lyrics-row__panel-section">
                  <div className="lyrics-row__panel-section-title">문법</div>
                  <div className="analysis-grammar">
                    {grammarResult.grammar.map((g, i) => (
                      <div key={i} className="analysis-grammar-card">
                        <span className="analysis-grammar-card__point jp-text">{g.point}</span>
                        <span className="analysis-grammar-card__explanation">{g.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
