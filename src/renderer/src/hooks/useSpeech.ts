import { useCallback, useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { initTts, speakJapanese, subscribeTts, getTtsSnapshot } from '../lib/tts'

// 일본어 발음 재생 훅. speaking은 이 훅 인스턴스가 시작한 발화에만 true가 된다.
export function useSpeech(text: string): {
  speak: () => void
  speaking: boolean
  available: boolean
} {
  useEffect(() => initTts(), [])

  const idRef = useRef(-1)
  const snap = useSyncExternalStore(subscribeTts, getTtsSnapshot)

  const speak = useCallback(() => {
    idRef.current = speakJapanese(text)
  }, [text])

  return {
    speak,
    speaking: snap.speakingId !== null && snap.speakingId === idRef.current,
    available: snap.available
  }
}
