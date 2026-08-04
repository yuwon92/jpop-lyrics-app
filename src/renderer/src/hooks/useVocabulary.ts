import { useCallback, Dispatch, SetStateAction } from 'react'
import { VocabWord } from '../types'
import { JAPANESE_RE } from '../lib/japanese'
import { useFavoriteCollection } from './useFavoriteCollection'

// 세션 내에서 이미 백필을 시도한 단어는 다시 시도하지 않는다
// (변환 실패가 반복되거나 목록을 다시 불러올 때마다 재실행되는 것을 방지)
const attemptedBackfillIds = new Set<number>()

function backfillReadings(data: VocabWord[], setWords: Dispatch<SetStateAction<VocabWord[]>>): void {
  const noReading = data.filter(
    (w) => !w.reading && JAPANESE_RE.test(w.word) && !attemptedBackfillIds.has(w.id)
  )
  if (noReading.length === 0) return
  noReading.forEach((w) => attemptedBackfillIds.add(w.id))
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
  const {
    items: words,
    loading,
    error,
    fetchAll,
    fetchBySong,
    deleteItem: deleteWord,
    toggleFavorite
  } = useFavoriteCollection<VocabWord>({
    fetchAllApi: () => window.api.vocab.getAll(),
    fetchBySongApi: (songId) => window.api.vocab.getBySong(songId),
    deleteApi: (id) => window.api.vocab.delete(id),
    toggleFavoriteApi: (id) => window.api.vocab.toggleFavorite(id),
    messages: {
      fetch: '단어장을 불러오지 못했습니다.',
      delete: '단어를 삭제하지 못했습니다.',
      favorite: '즐겨찾기를 변경하지 못했습니다.'
    },
    onFetched: backfillReadings
  })

  const addWord = useCallback(
    async (payload: { song_id: number | null; word: string; meaning: string }) => {
      await window.api.vocab.add(payload)
      await fetchAll()
    },
    [fetchAll]
  )

  return { words, loading, error, fetchAll, fetchBySong, addWord, deleteWord, toggleFavorite }
}
