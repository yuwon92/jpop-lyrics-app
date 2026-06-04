import { useState, useCallback } from 'react'
import { Song, LyricLine } from '../types'

declare global {
  interface Window {
    api: {
      convertReadingBulk: (lines: string[]) => Promise<string[]>
      anthropic: {
        hasKey: () => Promise<boolean>
        setKey: (key: string) => Promise<void>
        convertKorean: (lines: string[]) => Promise<string[]>
        translateWord: (word: string) => Promise<string>
        analyzeLine: (
          original: string,
          mode: 'translation' | 'grammar'
        ) => Promise<import('../types').TranslateResult | import('../types').GrammarResult>
      }
      songs: {
        getAll: () => Promise<Song[]>
        getOne: (id: number) => Promise<{ song: Song; lines: LyricLine[] }>
        save: (payload: {
          id?: number
          title: string
          artist: string
          lines: LyricLine[]
        }) => Promise<number>
        delete: (id: number) => Promise<void>
        saveKoreanReadings: (payload: { songId: number; readings: string[] }) => Promise<void>
      }
      vocab: {
        getAll: () => Promise<import('../types').VocabWord[]>
        getBySong: (songId: number) => Promise<import('../types').VocabWord[]>
        add: (payload: {
          song_id: number | null
          word: string
          reading?: string
          meaning: string
        }) => Promise<number>
        update: (payload: {
          id: number
          word: string
          reading?: string
          meaning: string
        }) => Promise<void>
        saveReadings: (entries: { id: number; reading: string }[]) => Promise<void>
        delete: (id: number) => Promise<void>
        toggleFavorite: (id: number) => Promise<boolean>
      }
    }
  }
}

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.songs.getAll()
      setSongs(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSong = useCallback(
    async (id: number) => {
      await window.api.songs.delete(id)
      await fetchAll()
    },
    [fetchAll]
  )

  return { songs, loading, fetchAll, deleteSong }
}
