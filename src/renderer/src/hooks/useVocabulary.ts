import { useState, useCallback, Dispatch, SetStateAction } from 'react'
import { VocabWord } from '../types'

const JAPANESE_RE = /[ぁ-鿿＀-ﾟ]/

function backfillReadings(data: VocabWord[], setWords: Dispatch<SetStateAction<VocabWord[]>>): void {
  const noReading = data.filter((w) => !w.reading && JAPANESE_RE.test(w.word))
  if (noReading.length === 0) return
  window.api.convertReadingBulk(noReading.map((w) => w.word))
    .then((readings) => {
      const entries = noReading
        .map((w, i) => ({ id: w.id, reading: readings[i] ?? '' }))
        .filter((e) => e.reading)
      if (entries.length === 0) return
      setWords((prev) =>
        prev.map((w) => {
          const e = entries.find((en) => en.id === w.id)
          return e ? { ...w, reading: e.reading } : w
        })
      )
      window.api.vocab.saveReadings(entries).catch(() => {})
    })
    .catch(() => {})
}

export function useVocabulary() {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.vocab.getAll()
      setWords(data)
      backfillReadings(data, setWords)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBySong = useCallback(async (songId: number) => {
    setLoading(true)
    try {
      const data = await window.api.vocab.getBySong(songId)
      setWords(data)
      backfillReadings(data, setWords)
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
      setWords((prev) => prev.filter((w) => w.id !== id))
    },
    []
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
