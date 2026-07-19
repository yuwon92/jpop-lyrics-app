import { useState, useCallback } from 'react'
import { GrammarNote } from '../types'

export function useGrammarNotes() {
  const [notes, setNotes] = useState<GrammarNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.grammarNotes.getAll()
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문법 노트를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBySong = useCallback(async (songId: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.grammarNotes.getBySong(songId)
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문법 노트를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNote = useCallback(async (id: number) => {
    try {
      await window.api.grammarNotes.delete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '노트를 삭제하지 못했습니다.')
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id: number) => {
    try {
      await window.api.grammarNotes.toggleFavorite(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '즐겨찾기를 변경하지 못했습니다.')
      return
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, favorited: !n.favorited } : n)))
  }, [])

  return { notes, loading, error, fetchAll, fetchBySong, deleteNote, toggleFavorite }
}
