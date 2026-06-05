import React, { useEffect, useState, useMemo, useCallback } from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import AddNoteModal from '../components/grammar/AddNoteModal'
import { Song, GrammarNote } from '../types'
import { useGrammarNotes } from '../hooks/useGrammarNotes'
import './GrammarNotes.css'

interface Props {
  songs: Song[]
}

type ViewMode = 'all' | 'by-song'

export default function GrammarNotes({ songs }: Props): JSX.Element {
  const { notes, loading, fetchAll, fetchBySong, deleteNote, toggleFavorite } = useGrammarNotes()

  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNote, setEditingNote] = useState<GrammarNote | null>(null)

  useEffect(() => {
    if (viewMode === 'all') {
      fetchAll()
    } else if (selectedSongId != null) {
      fetchBySong(selectedSongId)
    } else {
      fetchAll()
    }
  }, [viewMode, selectedSongId, fetchAll, fetchBySong])

  const refetch = useCallback(() => {
    if (viewMode === 'all' || selectedSongId == null) fetchAll()
    else fetchBySong(selectedSongId)
  }, [viewMode, selectedSongId, fetchAll, fetchBySong])

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    if (mode === 'all') setSelectedSongId(null)
    setShowFavOnly(false)
  }, [])

  const handleSelectSong = useCallback((id: number) => {
    setSelectedSongId(id)
    setShowFavOnly(false)
  }, [])

  const handleAddNote = useCallback(
    async (point: string, explanation: string, example: string) => {
      await window.api.grammarNotes.add({ song_id: selectedSongId, point, explanation, example })
      refetch()
    },
    [selectedSongId, refetch]
  )

  const handleUpdateNote = useCallback(
    async (point: string, explanation: string, example: string) => {
      if (!editingNote) return
      await window.api.grammarNotes.update({ id: editingNote.id, point, explanation, example })
      refetch()
    },
    [editingNote, refetch]
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteNote(id)
    },
    [deleteNote]
  )

  const noteCountBySong = useMemo(() => {
    const map: Record<number, number> = {}
    notes.forEach((n) => {
      if (n.song_id != null) map[n.song_id] = (map[n.song_id] ?? 0) + 1
    })
    return map
  }, [notes])

  const displayNotes = useMemo(() => {
    if (showFavOnly) return notes.filter((n) => n.favorited)
    return notes
  }, [notes, showFavOnly])

  const isEmpty = displayNotes.length === 0 && !loading

  return (
    <div className="grammar-notes-page">
      <RetroWindow title="문법 노트" icon="✦" accent="lavender" className="grammar-notes-window">
        <div className="grammar-notes-topbar">
          <div className="grammar-notes-mode-toggle">
            <button
              className={`grammar-notes-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => handleViewMode('all')}
            >
              전체 노트
            </button>
            <button
              className={`grammar-notes-toggle-btn ${viewMode === 'by-song' ? 'active' : ''}`}
              onClick={() => handleViewMode('by-song')}
            >
              노래별 노트
            </button>
          </div>
          <button
            className={`grammar-notes-fav-btn ${showFavOnly ? 'active' : ''}`}
            onClick={() => setShowFavOnly((v) => !v)}
            title="즐겨찾기만 보기"
          >
            ★ 즐겨찾기만
          </button>
        </div>

        <div className="grammar-notes-main">
          {viewMode === 'by-song' && (
            <div className="grammar-notes-sidebar">
              {songs.length === 0 ? (
                <div className="grammar-notes-sidebar__empty">노래 없음</div>
              ) : (
                songs.map((s) => (
                  <button
                    key={s.id}
                    className={`grammar-notes-song-item ${selectedSongId === s.id ? 'active' : ''}`}
                    onClick={() => handleSelectSong(s.id)}
                  >
                    <span className="grammar-notes-song-item__title">{s.title}</span>
                    <span className="grammar-notes-song-item__count">
                      {noteCountBySong[s.id] ?? 0}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="grammar-notes-body">
            {loading ? (
              <div className="grammar-notes-empty">불러오는 중...</div>
            ) : viewMode === 'by-song' && selectedSongId == null ? (
              <div className="grammar-notes-empty">
                <span className="grammar-notes-empty__icon">✦</span>
                <span>좌측에서 노래를 선택하세요</span>
              </div>
            ) : isEmpty ? (
              <div className="grammar-notes-empty">
                <span className="grammar-notes-empty__icon">✦</span>
                <span>
                  {showFavOnly ? '즐겨찾기한 노트가 없어요' : '저장된 문법 노트가 없어요'}
                </span>
                {!showFavOnly && (
                  <span className="grammar-notes-empty__hint">
                    가사 분석 패널의 [+] 버튼이나 아래 버튼으로 추가해보세요
                  </span>
                )}
              </div>
            ) : (
              <div className="grammar-notes-grid">
                {displayNotes.map((n) => (
                  <GrammarNoteCard
                    key={n.id}
                    note={n}
                    showSong={viewMode === 'all'}
                    onDelete={handleDelete}
                    onEdit={setEditingNote}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </RetroWindow>

      <button
        className="grammar-notes-add-btn"
        onClick={() => setShowAddModal(true)}
        title="노트 추가"
      >
        <span className="grammar-notes-add-btn__icon">+</span>
        <span className="grammar-notes-add-btn__label">노트 추가</span>
      </button>

      {showAddModal && (
        <AddNoteModal
          songId={selectedSongId}
          songTitle={
            selectedSongId != null
              ? songs.find((s) => s.id === selectedSongId)?.title
              : undefined
          }
          onAdd={handleAddNote}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingNote && (
        <AddNoteModal
          songId={editingNote.song_id}
          initialPoint={editingNote.point}
          initialExplanation={editingNote.explanation}
          initialExample={editingNote.example}
          onAdd={handleUpdateNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}

function GrammarNoteCard({
  note,
  showSong,
  onDelete,
  onEdit,
  onToggleFavorite
}: {
  note: GrammarNote
  showSong: boolean
  onDelete: (id: number) => void
  onEdit: (note: GrammarNote) => void
  onToggleFavorite: (id: number) => void
}): JSX.Element {
  return (
    <div className="grammar-note-card">
      <div className="grammar-note-card__header">
        <span className="grammar-note-card__point jp-text">{note.point}</span>
        <div className="grammar-note-card__actions">
          <button
            className={`grammar-note-card__fav ${note.favorited ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(note.id)}
            title={note.favorited ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {note.favorited ? '★' : '☆'}
          </button>
          <button
            className="grammar-note-card__edit"
            onClick={() => onEdit(note)}
            title="수정"
          >
            ✎
          </button>
          <button
            className="grammar-note-card__delete"
            onClick={() => onDelete(note.id)}
            title="삭제"
          >
            ×
          </button>
        </div>
      </div>
      <div className="grammar-note-card__explanation">{note.explanation}</div>
      {note.example && (
        <div className="grammar-note-card__example jp-text">{note.example}</div>
      )}
      {showSong && note.song_title && (
        <div className="grammar-note-card__song">
          <span>♪</span> {note.song_title}
        </div>
      )}
    </div>
  )
}
