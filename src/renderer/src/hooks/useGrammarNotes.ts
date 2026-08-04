import { GrammarNote } from '../types'
import { useFavoriteCollection } from './useFavoriteCollection'

export function useGrammarNotes() {
  const {
    items: notes,
    loading,
    error,
    fetchAll,
    fetchBySong,
    deleteItem: deleteNote,
    toggleFavorite
  } = useFavoriteCollection<GrammarNote>({
    fetchAllApi: () => window.api.grammarNotes.getAll(),
    fetchBySongApi: (songId) => window.api.grammarNotes.getBySong(songId),
    deleteApi: (id) => window.api.grammarNotes.delete(id),
    toggleFavoriteApi: (id) => window.api.grammarNotes.toggleFavorite(id),
    messages: {
      fetch: '문법 노트를 불러오지 못했습니다.',
      delete: '노트를 삭제하지 못했습니다.',
      favorite: '즐겨찾기를 변경하지 못했습니다.'
    }
  })

  return { notes, loading, error, fetchAll, fetchBySong, deleteNote, toggleFavorite }
}
