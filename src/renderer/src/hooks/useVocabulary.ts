import { useState, useCallback } from 'react'
import { VocabWord } from '../types'

export function useVocabulary() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.vocab.getAll()
      setWords(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBySong = useCallback(async (songId: number) => {
    setLoading(true)
    try {
      const data = await window.api.vocab.getBySong(songId)
      setWords(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const addWord = useCallback(
    async (payload: { song_id: number | null; word: string; meaning: string }) => {
      await window.api.vocab.add(payload)
      await fetchAll()
    },
    [fetchAll]
  )

  const deleteWord = useCallback(
    async (id: number) => {
      await window.api.vocab.delete(id)
      await fetchAll()
    },
    [fetchAll]
  )

  const toggleFavorite = useCallback(
    async (id: number) => {
      await window.api.vocab.toggleFavorite(id)
      setWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, favorited: !w.favorited } : w))
      )
    },
    []
  )

  return { words, loading, fetchAll, fetchBySong, addWord, deleteWord, toggleFavorite }
}
