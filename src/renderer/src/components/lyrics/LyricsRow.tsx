import { useState, useEffect, useRef } from 'react'
import { LyricLine, TranslateResult, GrammarResult, GrammarWord } from '../../types'
import ApiKeyModal from './ApiKeyModal'
import PixelButton from '../shared/PixelButton'
import './LyricsRow.css'

interface Props {
  line: LyricLine
  readingMode: 'hiragana' | 'korean'
  onChange: (field: 'original' | 'reading' | 'reading_ko' | 'translation', value: string) => void
  onWordAdded?: () => void
  onNoteAdded?: () => void
}

export default function LyricsRow({ line, readingMode, onChange, onWordAdded, onNoteAdded }: Props): JSX.Element {
  const isKorean = readingMode === 'korean'

  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [translateResult, setTranslateResult] = useState<TranslateResult | null>(null)
  const [grammarResult, setGrammarResult] = useState<GrammarResult | null>(null)
  const [savedWords, setSavedWords] = useState<Set<number>>(new Set())
  const [savedGrammar, setSavedGrammar] = useState<Set<number>>(new Set())

  const prevOriginalRef = useRef(line.original)
  useEffect(() => {
    if (prevOriginalRef.current !== line.original) {
      prevOriginalRef.current = line.original
      setTranslateResult(null)
      setGrammarResult(null)
      setPanelOpen(false)
      setSavedWords(new Set())
      setSavedGrammar(new Set())
    }
  }, [line.original])

  async function runAnalysis(): Promise<void> {
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

  async function handleAnalyze(): Promise<void> {
    if (panelOpen) {
      setPanelOpen(false)
      return
    }
    setPanelOpen(true)
    if (translateResult && grammarResult) return
    await runAnalysis()
  }

  async function handleKeySubmit(key: string): Promise<void> {
    await window.api.anthropic.setKey(key)
    setShowKeyModal(false)
    await runAnalysis()
  }

  async function handleSaveWord(w: GrammarWord, idx: number): Promise<void> {
    if (savedWords.has(idx)) return
    try {
      await window.api.vocab.add({
        song_id: line.song_id ?? null,
        word: w.word,
        reading: w.reading || undefined,
        meaning: w.meaning
      })
    } catch {
      setSaveError('단어를 저장하지 못했습니다. 다시 시도해 주세요.')
      return
    }
    setSaveError(null)
    setSavedWords((prev) => new Set(prev).add(idx))
    onWordAdded?.()
  }

  async function handleSaveGrammar(
    g: { point: string; explanation: string },
    idx: number
  ): Promise<void> {
    if (savedGrammar.has(idx)) return
    try {
      await window.api.grammarNotes.add({
        song_id: line.song_id ?? null,
        point: g.point,
        explanation: g.explanation,
        example: line.original
      })
    } catch {
      setSaveError('문법 노트를 저장하지 못했습니다. 다시 시도해 주세요.')
      return
    }
    setSaveError(null)
    setSavedGrammar((prev) => new Set(prev).add(idx))
    onNoteAdded?.()
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
              {error.includes('NO_API_KEY') ? (
                <>
                  <span>가사 분석을 하려면 Anthropic API 키가 필요해요.</span>
                  <PixelButton variant="secondary" size="sm" onClick={() => setShowKeyModal(true)}>
                    ✦ API 키 설정
                  </PixelButton>
                </>
              ) : (
                error
              )}
            </div>
          )}
          {saveError && <div className="lyrics-row__panel-error">{saveError}</div>}
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
                        <div className="analysis-grammar-card__header">
                          <span className="analysis-grammar-card__point jp-text">{g.point}</span>
                          <button
                            className={`analysis-grammar-card__save${savedGrammar.has(i) ? ' saved' : ''}`}
                            onClick={() => handleSaveGrammar(g, i)}
                            disabled={savedGrammar.has(i)}
                            title="문법 노트에 추가"
                          >
                            {savedGrammar.has(i) ? '✓' : '+'}
                          </button>
                        </div>
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

      {showKeyModal && (
        <ApiKeyModal
          description="가사 분석을 위해 Anthropic API 키가 필요해요."
          submitLabel="✦ 저장 후 분석"
          onSubmit={handleKeySubmit}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  )
}
