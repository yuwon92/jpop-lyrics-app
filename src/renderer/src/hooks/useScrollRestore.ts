import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * display:none으로 숨겼다가 다시 보일 때 스크롤 위치를 복원한다.
 *
 * frozen이 true인 동안(숨김 상태이거나 목록을 다시 불러오는 중)은
 * 콘텐츠 교체로 scrollTop이 0으로 클램프되며 발생하는 scroll 이벤트를
 * 기록하지 않아, 저장된 위치가 덮어써지지 않는다.
 */
export function useScrollRestore<T extends HTMLElement>(frozen: boolean): {
  ref: React.RefObject<T>
  onScroll: React.UIEventHandler<T>
} {
  const ref = useRef<T>(null)
  const savedTopRef = useRef(0)
  const frozenRef = useRef(frozen)
  frozenRef.current = frozen

  useLayoutEffect(() => {
    if (!frozen && ref.current) {
      ref.current.scrollTop = savedTopRef.current
    }
  }, [frozen])

  const onScroll = useCallback<React.UIEventHandler<T>>((e) => {
    if (frozenRef.current) return
    savedTopRef.current = e.currentTarget.scrollTop
  }, [])

  return { ref, onScroll }
}
