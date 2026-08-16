// 일본어 발음 재생 엔진 — Web Speech API 구현.
// 외부에서는 이 파일의 공개 함수(또는 useSpeech 훅)만 사용할 것.
// 클라우드 TTS로 교체할 때는 이 파일 내부 구현만 바꾸면 된다.

const TTS_RATE = 0.9 // 학습용으로 약간 느리게

export const TTS_UNAVAILABLE_HINT =
  '일본어 음성이 설치되어 있지 않아요 (Windows 설정 → 시간 및 언어 → 언어 및 지역 → 일본어 추가)'

export interface TtsSnapshot {
  available: boolean // ja 음성 사용 가능 여부 (탐색 중에는 낙관적으로 true)
  speakingId: number | null // 현재 재생 중인 발화 id
}

let initialized = false
let resolved = false // 음성 탐색이 끝났는지
let jaVoice: SpeechSynthesisVoice | null = null
let speakingId: number | null = null
// Chromium은 utterance가 GC되면 onend가 오지 않으므로 참조를 유지한다
let currentUtterance: SpeechSynthesisUtterance | null = null
let pendingSpeak: ReturnType<typeof setTimeout> | null = null
let nextId = 1

const listeners = new Set<() => void>()
let snapshot: TtsSnapshot = { available: true, speakingId: null }

function emit(): void {
  const available = resolved ? jaVoice !== null : true
  if (snapshot.available === available && snapshot.speakingId === speakingId) return
  snapshot = { available, speakingId }
  listeners.forEach((l) => l())
}

export function subscribeTts(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getTtsSnapshot(): TtsSnapshot {
  return snapshot
}

// 우선순위: ja-JP + 로컬 음성 > ja-JP > ja*
export function pickJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const norm = (lang: string): string => lang.toLowerCase().replace('_', '-')
  const jaAll = voices.filter((v) => norm(v.lang).startsWith('ja'))
  if (jaAll.length === 0) return null
  const jaJp = jaAll.filter((v) => norm(v.lang) === 'ja-jp')
  const pool = jaJp.length > 0 ? jaJp : jaAll
  return pool.find((v) => v.localService) ?? pool[0]
}

export function initTts(): void {
  if (initialized) return
  initialized = true

  if (typeof speechSynthesis === 'undefined') {
    resolved = true
    emit()
    return
  }

  const tryResolve = (): boolean => {
    const voices = speechSynthesis.getVoices()
    if (voices.length === 0) return false
    jaVoice = pickJapaneseVoice(voices)
    resolved = true
    emit()
    return true
  }

  if (tryResolve()) return

  // getVoices()는 비동기 로드라 처음엔 빈 배열일 수 있다.
  // voiceschanged가 오지 않는 Electron 사례가 있어 폴링을 병행하고,
  // 리스너는 계속 두어 나중에 음성이 설치되는 경우도 반영한다.
  speechSynthesis.addEventListener('voiceschanged', () => tryResolve())

  let polls = 0
  const timer = setInterval(() => {
    polls += 1
    if (tryResolve() || polls >= 12) {
      clearInterval(timer)
      if (!resolved) {
        // ~3초까지도 목록이 비어 있으면 사용 불가로 확정
        resolved = true
        emit()
      }
    }
  }, 250)
}

// 발화를 시작하고 발화 id를 반환한다. 재생 중이면 끊고 새로 시작.
// ja 음성이 없으면 아무것도 하지 않고 -1 반환 — 다른 언어 음성이
// 일본어를 깨진 발음으로 읽는 것을 막기 위해 lang만 지정한 발화는 하지 않는다.
export function speakJapanese(text: string): number {
  if (!jaVoice || !text) return -1

  const id = nextId++
  if (pendingSpeak) clearTimeout(pendingSpeak)
  speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.voice = jaVoice
  u.lang = 'ja-JP'
  u.rate = TTS_RATE
  u.pitch = 1
  u.onstart = () => {
    if (currentUtterance !== u) return
    speakingId = id
    emit()
  }
  // cancel로 인한 interrupted 에러도 정상 종료로 취급
  const done = (): void => {
    if (currentUtterance !== u) return
    currentUtterance = null
    speakingId = null
    emit()
  }
  u.onend = done
  u.onerror = done

  currentUtterance = u
  // Chromium은 cancel 직후의 speak를 무시할 수 있어 한 틱 미룬다
  pendingSpeak = setTimeout(() => {
    pendingSpeak = null
    speechSynthesis.speak(u)
  }, 0)
  return id
}

export function stopSpeaking(): void {
  if (pendingSpeak) {
    clearTimeout(pendingSpeak)
    pendingSpeak = null
  }
  currentUtterance = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  if (speakingId !== null) {
    speakingId = null
    emit()
  }
}
