// 히라가나~한자·전각/반각 가타카나 범위에 걸치는 일본어 문자 판별
export const JAPANESE_RE = /[ぁ-鿿＀-ﾟ]/

export function isJapanese(text: string): boolean {
  return JAPANESE_RE.test(text)
}
