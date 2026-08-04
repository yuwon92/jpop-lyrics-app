import { useState, useCallback, useRef, Dispatch, SetStateAction } from 'react'

interface Options<T> {
  fetchAllApi: () => Promise<T[]>
  fetchBySongApi: (songId: number) => Promise<T[]>
  deleteApi: (id: number) => Promise<unknown>
  toggleFavoriteApi: (id: number) => Promise<unknown>
  messages: { fetch: string; delete: string; favorite: string }
  /** 목록을 성공적으로 불러온 뒤 후처리 (예: 읽기 백필) */
  onFetched?: (data: T[], setItems: Dispatch<SetStateAction<T[]>>) => void
}

/**
 * 단어장·문법 노트가 공유하는 목록 훅: 로딩/에러 상태, 전체·노래별 조회,
 * 삭제·즐겨찾기의 낙관적 갱신을 담당한다.
 */
export function useFavoriteCollection<T extends { id: number; favorited: boolean }>(
  options: Options<T>
) {
  // 옵션 객체는 렌더마다 새로 만들어지므로 ref로 받아 콜백 identity를 안정화한다
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runFetch = useCallback(async (fetcher: () => Promise<T[]>) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetcher()
      setItems(data)
      optionsRef.current.onFetched?.(data, setItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : optionsRef.current.messages.fetch)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAll = useCallback(() => runFetch(() => optionsRef.current.fetchAllApi()), [runFetch])

  const fetchBySong = useCallback(
    (songId: number) => runFetch(() => optionsRef.current.fetchBySongApi(songId)),
    [runFetch]
  )

  const deleteItem = useCallback(async (id: number) => {
    try {
      await optionsRef.current.deleteApi(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : optionsRef.current.messages.delete)
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id: number) => {
    try {
      await optionsRef.current.toggleFavoriteApi(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : optionsRef.current.messages.favorite)
      return
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, favorited: !item.favorited } : item))
    )
  }, [])

  return { items, loading, error, fetchAll, fetchBySong, deleteItem, toggleFavorite }
}
