/**
 * 단어장 추가의 공통 진입점 — 빈 읽기(reading)를 undefined로 정규화하는 규칙을
 * 한 곳에서 관리한다. (에디터/단어장 페이지/줄 분석 패널/홈에서 공용)
 */
export function addVocabWord(params: {
  songId: number | null
  word: string
  reading?: string
  meaning: string
}): Promise<number> {
  return window.api.vocab.add({
    song_id: params.songId,
    word: params.word,
    reading: params.reading || undefined,
    meaning: params.meaning
  })
}
