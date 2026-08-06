import { ipcMain } from 'electron'
import { dirname, join } from 'path'
import * as kuromoji from 'kuromoji'

export type LemmaRecommendation = {
  selected: string
  lemma: string
  reading: string
  suggested: boolean
}

type Token = kuromoji.IpadicFeatures
type Tokenizer = kuromoji.Tokenizer<Token>

// 자립어로 취급하는 품사 — 이 중 하나로 시작하는 선택만 기본형을 추천한다
const CONTENT_POS = new Set(['動詞', '形容詞', '名詞', '副詞', '連体詞', '接続詞', '感動詞'])

let tokenizerPromise: Promise<Tokenizer | null> | null = null

function defaultDictPath(): string {
  // kuromoji main은 src/kuromoji.js — 패키지 루트의 dict/를 가리킨다
  return join(dirname(require.resolve('kuromoji')), '..', 'dict')
}

export function setupLemmaTokenizer(dictPath?: string): Promise<Tokenizer | null> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve) => {
      try {
        kuromoji.builder({ dicPath: dictPath ?? defaultDictPath() }).build((err, tokenizer) => {
          if (err) {
            console.error('[lemma] tokenizer 초기화 실패:', err)
            resolve(null)
          } else {
            resolve(tokenizer)
          }
        })
      } catch (err) {
        console.error('[lemma] tokenizer 초기화 실패:', err)
        resolve(null)
      }
    })
  }
  return tokenizerPromise
}

function katakanaToHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

/** 활용 어미로 뒤에 붙을 수 있는 토큰인지 (ました, かった, ている 등) */
function isTrailingToken(token: Token): boolean {
  if (token.pos === '助動詞' || token.pos === '助詞' || token.pos === '記号') return true
  // 食べて「いる」, 飲んで「しまう」 같은 비자립 동사·형용사
  if ((token.pos === '動詞' || token.pos === '形容詞') && token.pos_detail_1 === '非自立') return true
  return false
}

function readingOf(tokenizer: Tokenizer, word: string): string {
  const tokens = tokenizer.tokenize(word)
  if (tokens.length === 0) return ''
  const parts: string[] = []
  for (const t of tokens) {
    if (!t.reading || t.reading === '*') return ''
    parts.push(t.reading)
  }
  return katakanaToHiragana(parts.join(''))
}

export async function recommendLemma(text: string): Promise<LemmaRecommendation> {
  const selected = String(text ?? '').trim()
  const fallback: LemmaRecommendation = { selected, lemma: selected, reading: '', suggested: false }
  if (!selected) return fallback

  const tokenizer = await setupLemmaTokenizer()
  if (!tokenizer) return fallback

  try {
    const tokens = tokenizer.tokenize(selected)
    if (tokens.length === 0) return fallback

    const [head, ...rest] = tokens
    if (!CONTENT_POS.has(head.pos)) return fallback
    if (!rest.every(isTrailingToken)) return fallback

    const lemma = head.basic_form
    if (!lemma || lemma === '*' || lemma === selected) return fallback

    return { selected, lemma, reading: readingOf(tokenizer, lemma), suggested: true }
  } catch (err) {
    console.error('[lemma] 분석 실패:', err)
    return fallback
  }
}

export function registerLemmaHandler(): void {
  ipcMain.handle('japanese:recommend-lemma', (_e, text: string) => recommendLemma(text))
}
