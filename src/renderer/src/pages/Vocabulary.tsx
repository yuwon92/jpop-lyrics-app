import React, { useEffect, useState, useMemo, useCallback } from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import StudyToolbar from '../components/vocabulary/StudyToolbar'
import FlashcardModal from '../components/vocabulary/FlashcardModal'
import FloatingAddButton from '../components/vocabulary/FloatingAddButton'
import AddWordModal from '../components/vocabulary/AddWordModal'
import { Song, VocabWord } from '../types'
import { useVocabulary } from '../hooks/useVocabulary'
import './Vocabulary.css'

interface Props {
  songs: Song[]
  onWordAdded?: () => void
}

type ViewMode = 'all' | 'by-song'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Vocabulary({ songs, onWordAdded }: Props): JSX.Element {
  const { words, loading, fetchAll, fetchBySong, deleteWord, toggleFavorite } = useVocabulary()

  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledWords, setShuffledWords] = useState<VocabWord[]>([])
  const [showFlashcard, setShowFlashcard] = useState(false)
  const [showWordModal, setShowWordModal] = useState(false)
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null)

  // Fetch words based on view mode + selected song
  useEffect(() => {
    if (viewMode === 'all') {
      fetchAll()
    } else if (selectedSongId != null) {
      fetchBySong(selectedSongId)
    } else {
      fetchAll()
    }
  }, [viewMode, selectedSongId, fetchAll, fetchBySong])

  // Re-shuffle when words change (if shuffle is on)
  useEffect(() => {
    if (isShuffled) {
      setShuffledWords(shuffle(words))
    }
  }, [words, isShuffled])

  const displayWords = useMemo(() => {
    let base = isShuffled ? shuffledWords : words
    if (showFavOnly) base = base.filter((w) => w.favorited)
    return base
  }, [words, isShuffled, shuffledWords, showFavOnly])

  const handleToggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      if (!prev) setShuffledWords(shuffle(words))
      return !prev
    })
  }, [words])

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    if (mode === 'all') setSelectedSongId(null)
    setIsShuffled(false)
    setShowFavOnly(false)
  }, [])

  const handleSelectSong = useCallback((id: number) => {
    setSelectedSongId(id)
    setIsShuffled(false)
    setShowFavOnly(false)
  }, [])

  const handleAddWord = useCallback(async (word: string, reading: string, meaning: string) => {
    await window.api.vocab.add({ song_id: selectedSongId, word, reading: reading || undefined, meaning })
    onWordAdded?.()
    if (viewMode === 'all') {
      fetchAll()
    } else if (selectedSongId != null) {
      fetchBySong(selectedSongId)
    } else {
      fetchAll()
    }
  }, [selectedSongId, viewMode, fetchAll, fetchBySong, onWordAdded])

  const handleDeleteWord = useCallback(async (id: number) => {
    await deleteWord(id)
    onWordAdded?.()
  }, [deleteWord, onWordAdded])

  const handleUpdateWord = useCallback(async (word: string, reading: string, meaning: string) => {
    if (!editingWord) return
    await window.api.vocab.update({ id: editingWord.id, word, reading: reading || undefined, meaning })
    onWordAdded?.()
    if (viewMode === 'all') {
      fetchAll()
    } else if (selectedSongId != null) {
      fetchBySong(selectedSongId)
    } else {
      fetchAll()
    }
  }, [editingWord, viewMode, selectedSongId, fetchAll, fetchBySong, onWordAdded])

  const isEmpty = displayWords.length === 0 && !loading

  return (
    <div className="vocabulary-page">
      <RetroWindow title="단어장" icon="★" accent="lavender" className="vocab-window">
        {/* Top toggle bar */}
        <div className="vocab-topbar">
          <div className="vocab-mode-toggle">
            <button
              className={`vocab-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => handleViewMode('all')}
            >
              전체 단어장
            </button>
            <button
              className={`vocab-toggle-btn ${viewMode === 'by-song' ? 'active' : ''}`}
              onClick={() => handleViewMode('by-song')}
            >
              노래별 단어장
            </button>
          </div>
          <StudyToolbar
            showFavOnly={showFavOnly}
            isShuffled={isShuffled}
            onFlashcard={() => setShowFlashcard(true)}
            onToggleShuffle={handleToggleShuffle}
            onToggleFavOnly={() => setShowFavOnly((v) => !v)}
            disabled={words.length === 0}
          />
        </div>

        {/* Main body: optional sidebar + word grid */}
        <div className="vocab-main">
          {viewMode === 'by-song' && (
            <div className="vocab-sidebar">
              {songs.length === 0 ? (
                <div className="vocab-sidebar__empty">노래 없음</div>
              ) : (
                songs.map((s) => (
                  <button
                    key={s.id}
                    className={`vocab-song-item ${selectedSongId === s.id ? 'active' : ''}`}
                    onClick={() => handleSelectSong(s.id)}
                  >
                    <span className="vocab-song-item__title">{s.title}</span>
                    <span className="vocab-song-item__count">{s.word_count ?? 0}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="vocab-body">
            {loading ? (
              <div className="vocab-empty">불러오는 중...</div>
            ) : viewMode === 'by-song' && selectedSongId == null ? (
              <div className="vocab-empty">
                <span className="vocab-empty__icon">♪</span>
                <span>좌측에서 노래를 선택하세요</span>
              </div>
            ) : isEmpty ? (
              <div className="vocab-empty">
                <span className="vocab-empty__icon">☆</span>
                <span>
                  {showFavOnly
                    ? '즐겨찾기한 단어가 없어요'
                    : '저장된 단어가 없어요'}
                </span>
                {!showFavOnly && (
                  <span className="vocab-empty__hint">우하단의 [+ 단어 추가] 버튼을 눌러보세요</span>
                )}
              </div>
            ) : (
              <div className="vocab-grid">
                {displayWords.map((w) => (
                  <WordCard
                    key={w.id}
                    word={w}
                    onDelete={handleDeleteWord}
                    onEdit={setEditingWord}
                    onToggleFavorite={toggleFavorite}
                    showSong={viewMode === 'all'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </RetroWindow>

      <FloatingAddButton onClick={() => setShowWordModal(true)} />
      {showWordModal && (
        <AddWordModal
          songId={selectedSongId}
          songTitle={selectedSongId != null ? songs.find((s) => s.id === selectedSongId)?.title : undefined}
          onAdd={handleAddWord}
          onClose={() => setShowWordModal(false)}
        />
      )}
      {editingWord && (
        <AddWordModal
          songId={editingWord.song_id}
          initialWord={editingWord.word}
          initialReading={editingWord.reading ?? ''}
          initialMeaning={editingWord.meaning}
          onAdd={handleUpdateWord}
          onClose={() => setEditingWord(null)}
        />
      )}

      {showFlashcard && (
        <FlashcardModal
          words={displayWords}
          onToggleFavorite={toggleFavorite}
          onClose={() => setShowFlashcard(false)}
        />
      )}
    </div>
  )
}

function WordCard({
  word,
  onDelete,
  onEdit,
  onToggleFavorite,
  showSong
}: {
  word: VocabWord
  onDelete: (id: number) => void
  onEdit: (word: VocabWord) => void
  onToggleFavorite: (id: number) => void
  showSong: boolean
}): JSX.Element {
  return (
    <div className="word-card">
      <div className="word-card__header">
        <span className="word-card__word jp-text">{word.word}</span>
        <div className="word-card__actions">
          <button
            className={`word-card__fav ${word.favorited ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(word.id)}
            title={word.favorited ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {word.favorited ? '★' : '☆'}
          </button>
          <button
            className="word-card__edit"
            onClick={() => onEdit(word)}
            title="수정"
          >
            ✎
          </button>
          <button
            className="word-card__delete"
            onClick={() => onDelete(word.id)}
            title="삭제"
          >
            ×
          </button>
        </div>
      </div>
      {word.reading && word.reading !== word.word && (
        <div className="word-card__reading jp-text">{word.reading}</div>
      )}
      <div className="word-card__meaning">{word.meaning}</div>
      {showSong && word.song_title && (
        <div className="word-card__song">
          <span>♪</span> {word.song_title}
        </div>
      )}
    </div>
  )
}
