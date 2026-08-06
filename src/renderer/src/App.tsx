import { useState, useEffect, useCallback } from 'react'
import MenuBar from './components/layout/MenuBar'
import { useTheme } from './hooks/useTheme'
import Home from './pages/Home'
import LyricsEditor from './pages/LyricsEditor'
import Vocabulary from './pages/Vocabulary'
import GrammarNotes from './pages/GrammarNotes'
import Settings from './pages/Settings'
import FloatingAddButton from './components/vocabulary/FloatingAddButton'
import AddWordModal from './components/vocabulary/AddWordModal'
import { Page, Song, LyricLine } from './types'
import { useSongs } from './hooks/useSongs'
import { addVocabWord } from './lib/vocab'
import './App.css'

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('home')
  const [showModal, setShowModal] = useState(false)
  const [currentSongId, setCurrentSongId] = useState<number | null>(null)
  const [editingSong, setEditingSong] = useState<{ song: Song; lines: LyricLine[] } | null>(null)

  const { theme, setTheme } = useTheme()
  const { songs, loading, error, fetchAll, deleteSong } = useSongs()

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
    async (word: string, reading: string, meaning: string) => {
      await addVocabWord({ songId: currentSongId, word, reading, meaning })
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
            error={error}
            onRetry={fetchAll}
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
            onExit={() => handleNavigate('home')}
          />
        )}
        {page === 'vocabulary' && <Vocabulary songs={songs} onWordAdded={fetchAll} />}
        {page === 'grammar-notes' && <GrammarNotes songs={songs} />}
        {page === 'settings' && <Settings theme={theme} onChangeTheme={setTheme} />}
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
