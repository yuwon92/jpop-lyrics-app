import { useState, useCallback } from 'react'
import { GrammarNote } from '../types'

export function useGrammarNotes() {
  const [notes, setNotes] = useState<GrammarNote[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.grammarNotes.getAll()
      setNotes(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBySong = useCallback(async (songId: number) => {
    setLoading(true)
    try {
      const data = await window.api.grammarNotes.getBySong(songId)
      setNotes(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNote = useCallback(async (id: number) => {
    await window.api.grammarNotes.delete(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id: number) => {
    await window.api.grammarNotes.toggleFavorite(id)
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, favorited: !n.favorited } : n)))
  }, [])

  return { notes, loading, fetchAll, fetchBySong, deleteNote, toggleFavorite }
}
