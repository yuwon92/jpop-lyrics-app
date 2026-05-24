import React, { useState, useEffect, useCallback } from 'react'
import MenuBar from './components/layout/MenuBar'
import Home from './pages/Home'
import LyricsEditor from './pages/LyricsEditor'
import Vocabulary from './pages/Vocabulary'
import FloatingAddButton from './components/vocabulary/FloatingAddButton'
import AddWordModal from './components/vocabulary/AddWordModal'
import { Page, Song, LyricLine } from './types'
import { useSongs } from './hooks/useSongs'
import './App.css'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('home')
  const [showModal, setShowModal] = useState(false)
  const [currentSongId, setCurrentSongId] = useState<number | null>(null)
  const [editingSong, setEditingSong] = useState<{ song: Song; lines: LyricLine[] } | null>(null)

  const { songs, loading, fetchAll, deleteSong } = useSongs()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleNavigate = useCallback((p: Page) => {
    if (p === 'editor' && page !== 'editor') {
      setEditingSong(null)
    }
    setPage(p)
  }, [page])

  const handleNewSong = useCallback(() => {
    setEditingSong(null)
    setCurrentSongId(null)
    setPage('editor')
  }, [])

  const handleEditSong = useCallback(async (song: Song) => {
    const data = await window.api.songs.getOne(song.id)
    setEditingSong(data)
    setCurrentSongId(song.id)
    setPage('editor')
  }, [])

  const handleSaved = useCallback(
    (songId: number) => {
      setCurrentSongId(songId)
      fetchAll()
    },
    [fetchAll]
  )

  const handleDeleteSong = useCallback(
    async (id: number) => {
      await deleteSong(id)
      if (currentSongId === id) {
        setCurrentSongId(null)
        setEditingSong(null)
      }
    },
    [deleteSong, currentSongId]
  )

  const handleAddWord = useCallback(
    async (word: string, meaning: string) => {
      await window.api.vocab.add({ song_id: currentSongId, word, meaning })
      fetchAll()
    },
    [currentSongId, fetchAll]
  )

  const currentSong = songs.find((s) => s.id === currentSongId)

  return (
    <div className="app">
      <MenuBar currentPage={page} onNavigate={handleNavigate} />
      <main className="app__main">
        {page === 'home' && (
          <Home
            songs={songs}
            loading={loading}
            onNewSong={handleNewSong}
            onEditSong={handleEditSong}
            onDeleteSong={handleDeleteSong}
          />
        )}
        {page === 'editor' && (
          <LyricsEditor
            editingSong={editingSong}
            onSaved={handleSaved}
            currentSongId={currentSongId}
            setCurrentSongId={setCurrentSongId}
            onWordAdded={fetchAll}
          />
        )}
        {page === 'vocabulary' && <Vocabulary songs={songs} onWordAdded={fetchAll} />}
      </main>

      {page === 'home' && (
        <>
          <FloatingAddButton onClick={() => setShowModal(true)} />
          {showModal && (
            <AddWordModal
              songId={currentSongId}
              songTitle={currentSong?.title}
              onAdd={handleAddWord}
              onClose={() => setShowModal(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
