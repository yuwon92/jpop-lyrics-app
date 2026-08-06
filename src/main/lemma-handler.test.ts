import { describe, it, expect, beforeAll, vi } from 'vitest'
import path from 'path'
import { setupLemmaTokenizer, recommendLemma } from './lemma-handler'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() }
}))

const DICT_PATH = path.join(process.cwd(), 'node_modules', 'kuromoji', 'dict')

describe('recommendLemma', () => {
  beforeAll(async () => {
    const tokenizer = await setupLemmaTokenizer(DICT_PATH)
    expect(tokenizer).not.toBeNull()
  }, 30000)

  it('동사 활용형 食べました → 食べる을 추천한다', async () => {
    const r = await recommendLemma('食べました')
    expect(r).toEqual({ selected: '食べました', lemma: '食べる', reading: 'たべる', suggested: true })
  })

  it('て형 飲んで → 飲む을 추천한다', async () => {
    const r = await recommendLemma('飲んで')
    expect(r.suggested).toBe(true)
    expect(r.lemma).toBe('飲む')
    expect(r.reading).toBe('のむ')
  })

  it('형용사 과거형 高かった → 高い를 추천한다', async () => {
    const r = await recommendLemma('高かった')
    expect(r.suggested).toBe(true)
    expect(r.lemma).toBe('高い')
    expect(r.reading).toBe('たかい')
  })

  it('기본형 그대로인 愛는 원문을 유지한다', async () => {
    const r = await recommendLemma('愛')
    expect(r.suggested).toBe(false)
    expect(r.lemma).toBe('愛')
  })

  it('여러 자립어가 포함된 夜に駆ける는 원문을 유지한다', async () => {
    const r = await recommendLemma('夜に駆ける')
    expect(r.suggested).toBe(false)
    expect(r.lemma).toBe('夜に駆ける')
  })

  it('앞뒤 공백을 제거하고 분석한다', async () => {
    const r = await recommendLemma('  食べました  ')
    expect(r.selected).toBe('食べました')
    expect(r.lemma).toBe('食べる')
    expect(r.suggested).toBe(true)
  })

  it('빈 문자열은 원문 유지 결과를 반환한다', async () => {
    const r = await recommendLemma('   ')
    expect(r).toEqual({ selected: '', lemma: '', reading: '', suggested: false })
  })
})

describe('tokenizer 초기화 실패', () => {
  it('추천 없이 원문을 유지한다', async () => {
    vi.resetModules()
    vi.doMock('kuromoji', () => ({
      builder: () => ({
        build: (cb: (err: Error, tokenizer: null) => void) => cb(new Error('init fail'), null)
      })
    }))
    const mod = await import('./lemma-handler')
    await mod.setupLemmaTokenizer(DICT_PATH)
    const r = await mod.recommendLemma('食べました')
    expect(r).toEqual({ selected: '食べました', lemma: '食べました', reading: '', suggested: false })
    vi.doUnmock('kuromoji')
  })
})
