import { useState, useEffect, useCallback, useRef } from 'react'
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
  // 새 번역/편집을 시작할 때만 증가 — key로 쓰여 LyricsEditor를 초기화한다.
  // 탭 이동만으로는 바뀌지 않으므로 작업 중이던 내용이 유지된다.
  const [editorSession, setEditorSession] = useState(0)

  const { theme, setTheme } = useTheme()
  const { songs, loading, error, fetchAll, deleteSong } = useSongs()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 설정을 열기 직전의 탭 — 설정 창 [x]로 닫을 때 돌아갈 곳
  const pageBeforeSettingsRef = useRef<Page>('home')

  const handleNavigate = useCallback((p: Page) => {
    setPage((current) => {
      if (p === 'settings' && current !== 'settings') {
        pageBeforeSettingsRef.current = current
      }
      return p
    })
  }, [])

  const handleCloseSettings = useCallback(() => {
    setPage(pageBeforeSettingsRef.current)
  }, [])

  const handleNewSong = useCallback(() => {
    setEditingSong(null)
    setCurrentSongId(null)
    setEditorSession((s) => s + 1)
    setPage('editor')
  }, [])

  const handleEditSong = useCallback(async (song: Song) => {
    const data = await window.api.songs.getOne(song.id)
    setEditingSong(data)
    setCurrentSongId(song.id)
    setEditorSession((s) => s + 1)
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
        // 마운트된 에디터가 삭제된 노래를 자동 저장으로 되살리지 않게 초기화
        setEditorSession((s) => s + 1)
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
        {/* 탭을 오가도 각 페이지의 작업 상태·스크롤이 유지되도록 항상 마운트하고 숨김 처리 */}
        <Home
          hidden={page !== 'home'}
          songs={songs}
          loading={loading}
          error={error}
          onRetry={fetchAll}
          onNewSong={handleNewSong}
          onEditSong={handleEditSong}
          onDeleteSong={handleDeleteSong}
        />
        <LyricsEditor
          key={editorSession}
          hidden={page !== 'editor'}
          editingSong={editingSong}
          onSaved={handleSaved}
          currentSongId={currentSongId}
          setCurrentSongId={setCurrentSongId}
          onWordAdded={fetchAll}
          onExit={() => handleNavigate('home')}
        />
        <Vocabulary hidden={page !== 'vocabulary'} songs={songs} onWordAdded={fetchAll} />
        <GrammarNotes hidden={page !== 'grammar-notes'} songs={songs} />
        {page === 'settings' && (
          <Settings theme={theme} onChangeTheme={setTheme} onClose={handleCloseSettings} />
        )}
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
