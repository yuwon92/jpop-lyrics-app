import Anthropic from '@anthropic-ai/sdk'
import { ipcMain, safeStorage, app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { getAnalysisCache, setAnalysisCache } from './database'

const TRANSLATE_PROMPT = `당신은 일본어 가사를 한국어로 번역하는 번역가입니다.
사용자가 가사 한 줄을 보내면, 아래 JSON으로만 답하세요.

[규칙]
- JSON만 출력하세요. 인사말, 설명, 마크다운은 넣지 마세요.
- literal(직역)은 단어와 문법 구조를 그대로 살려 옮기세요. 부사·어휘는 표준적인 의미 강도를 유지하고, 확신을 뜻하는 말을 추측처럼 약하게 바꾸지 마세요.
- free(의역)는 자연스러운 한국어로 옮기되, 원문의 길이와 톤을 유지하고 없는 정보를 더하지 마세요.
- 직역과 의역이 거의 같다면 free는 빈 문자열로 두세요.

[출력 형식]
{
  "line": "원문 그대로",
  "literal": "직역",
  "free": "자연스러운 의역 (직역과 거의 같으면 빈 문자열)"
}`

const GRAMMAR_PROMPT = `당신은 일본어 가사를 한국인 학습자에게 설명하는 일본어 교사입니다.
사용자가 가사 한 줄을 보내면, 그 줄의 단어와 문법을 분석해 아래 JSON으로만 답하세요.

[규칙]
- JSON만 출력하세요. 인사말, 설명, 마크다운은 넣지 마세요.
- 모든 설명과 뜻풀이는 한국어로 쓰세요. 단어 뜻(meaning)도 영어가 아니라 한국어로 쓰세요.
- 설명 문장은 한국어로 쓰되, 원형이나 분석 대상 표현을 가리킬 때만 일본어를 쓰고 그 외에는 일본어를 섞지 마세요. "原形は", "形容詞" 같은 일본어 용어를 쓰지 말고 "원형은", "형용사"처럼 한국어로 쓰세요.
- 확실하지 않거나 해석이 갈리는 부분은 단정하지 말고 짧게 표시하세요.

[단어(words)]
- 이해에 중요한 단어만 2~4개. 조사나 아주 기초적인 단어는 빼세요.
- meaning은 주요 뜻을 여러 개 나열해도 되며, 문맥에 가장 맞는 뜻을 맨 앞에 두세요.

[문법(grammar)]
- 그 줄에서 중요한 포인트만 1~3개.
- 화자의 감정·어조 해석은 쓰지 마세요. 문법 요소를 하나하나 분해하지 마세요.
- explanation은 한 줄로, 다음 형식으로 쓰세요.
  · 축약·생략·문어체인 경우: "원형은 OOO. (어떤 변형인지) '한국어 표현'이라는 뜻으로 (기능)을 나타냄"
  · 일반 표현인 경우: "'한국어 표현'에 해당하며 (기능)을 나타냄"
- 표준 형태인 표현을 억지로 축약이라고 설명하거나, 없는 원형을 만들어내지 마세요. 축약·변형이 아니면 일반 표현 형식으로 쓰세요.
- 「형용사く + なんだ」 형태는 「형용사く + なるんだ」에서 る가 빠진 구어 축약입니다. 과거형(なった)으로 잘못 해석하지 말고, なる(변화)의 의미를 살려 복원하세요.

[출력 형식]
{
  "line": "원문 그대로",
  "words": [
    { "word": "단어", "reading": "읽기", "meaning": "뜻", "pos": "품사" }
  ],
  "grammar": [
    { "point": "문법/표현 이름", "explanation": "고정 형식에 맞춘 한 줄 설명" }
  ]
}`

// 모델이 가끔 ```json ... ``` 마크다운 코드 펜스로 감싸 응답하므로,
// JSON.parse 전에 펜스를 벗기고 첫 { 부터 마지막 } 까지만 추출한다.
function extractJson(text: string): string {
  let s = text.trim()
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1)
  }
  return s
}

let keyFilePath: string

function getKeyFilePath(): string {
  if (!keyFilePath) {
    keyFilePath = path.join(app.getPath('userData'), 'anthropic-key.bin')
  }
  return keyFilePath
}

function getStoredApiKey(): string | null {
  const p = getKeyFilePath()
  if (!fs.existsSync(p)) return null
  try {
    const data = fs.readFileSync(p)
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data)
    }
    return data.toString('utf-8')
  } catch {
    return null
  }
}

function storeApiKey(key: string): void {
  const p = getKeyFilePath()
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key)
    fs.writeFileSync(p, encrypted)
  } else {
    fs.writeFileSync(p, Buffer.from(key, 'utf-8'))
    dialog.showMessageBox({
      type: 'warning',
      title: 'API 키 저장 경고',
      message: 'OS 수준 암호화를 사용할 수 없어 API 키가 평문으로 저장되었습니다.',
      detail:
        `저장 위치: ${p}\n\n` +
        `이 컴퓨터를 다른 사람과 공유하는 경우 키가 노출될 수 있습니다. ` +
        `사용 후 Anthropic 콘솔에서 키를 관리하는 것을 권장합니다.`
    })
  }
}

export function registerAnthropicHandler(): void {
  ipcMain.handle('anthropic:has-key', () => getStoredApiKey() !== null)

  ipcMain.handle('anthropic:set-key', (_e, key: string) => {
    storeApiKey(key.trim())
  })

  ipcMain.handle('anthropic:delete-key', () => {
    const p = getKeyFilePath()
    if (fs.existsSync(p)) fs.rmSync(p)
  })

  ipcMain.handle('anthropic:convert-korean', async (_e, lines: string[]) => {
    const apiKey = getStoredApiKey()
    if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.')

    // renderer의 lib/japanese.ts와 같은 범위 — 히라가나~한자·전각/반각 가타카나
    const JAPANESE_RE = /[ぁ-鿿＀-ﾟ]/

    // 일본어가 없는 줄(영어 가사 등)은 API에 보내지 않는다.
    // 모델이 변환할 게 없는 줄을 건너뛰면 이후 줄의 발음이 한 칸씩 밀리기 때문.
    // 이런 줄은 원문을 그대로 발음란에 쓴다 (히라가나 모드와 동일한 동작).
    const japaneseLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => JAPANESE_RE.test(line))
    const results = lines.map((line) => (JAPANESE_RE.test(line) ? '' : line))

    if (japaneseLines.length > 0) {
      const client = new Anthropic({ apiKey })

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: [
          '아래 일본어 가사를 한국어 발음 표기(한글)로 변환해.',
          '규칙:',
          '- 줄 수를 입력과 동일하게 유지해 (빈 줄 추가 금지)',
          '- 각 줄을 발음 표기만 출력 (설명, 번호, 기호 없음)',
          '- 일본어 부분만 한글 발음으로 바꾸고, 영어 등 일본어가 아닌 부분은 변환하지 말고 그대로 둬',
          '- 일본어를 원문(가나·한자)이나 로마자로 표기하지 마',
          '',
          '예시:',
          '입력: 夜に駆ける',
          '출력: 요루니 카케루',
          '',
          '입력: ただ過ぎる ノートの余白に書く',
          '출력: 다다 스기루 노-토노 요하쿠니 카쿠',
          '',
          '입력: Stay with me 帰さないよ',
          '출력: Stay with me 카에사나이요'
        ].join('\n'),
        messages: [{ role: 'user', content: japaneseLines.map(({ line }) => line).join('\n') }]
      })

      const first = message.content[0]
      const text = first?.type === 'text' ? first.text : ''
      const converted = text.trim().split('\n').filter((l) => l.trim() !== '')
      japaneseLines.forEach(({ index }, k) => {
        results[index] = converted[k] ?? ''
      })
    }

    return results
  })

  ipcMain.handle('anthropic:translate-word', async (_e, word: string) => {
    const apiKey = getStoredApiKey()
    if (!apiKey) throw new Error('NO_API_KEY')

    const model = 'claude-haiku-4-5-20251001'
    // 원문/기본형 전환이나 같은 단어 재추가 시 API 재호출 없이 캐시 사용
    // ('' 응답도 유효한 결과이므로 null 체크가 아닌 string 타입으로 판별)
    const cacheKey = `word::${word.trim()}::${model}`
    const cached = getAnalysisCache(cacheKey)
    if (typeof cached === 'string') return cached

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model,
      max_tokens: 256,
      system: [
        '일본어 단어나 어구를 한국어로 번역해.',
        '규칙:',
        '- 의미 있는 일본어 단어/어구라면: 한국어 뜻만 출력 (예: "새벽, 동이 틈")',
        '- 조사 단독(に, を, が 등), 숫자만, 의미 없는 문자 조합이라면: 빈 문자열만 반환',
        '- 설명·예문·품사 없이 한 줄로만 출력'
      ].join('\n'),
      messages: [{ role: 'user', content: word }]
    })

    const first = message.content[0]
    const result = (first?.type === 'text' ? first.text : '').trim()
    setAnalysisCache(cacheKey, result)
    return result
  })

  ipcMain.handle(
    'anthropic:analyze-line',
    async (_e, original: string, mode: 'translation' | 'grammar') => {
      const apiKey = getStoredApiKey()
      if (!apiKey) throw new Error('NO_API_KEY')

      const model = 'claude-sonnet-4-6'
      const cacheKey = `${original}::${mode}::${model}`

      const cached = getAnalysisCache(cacheKey)
      if (cached) return cached

      const client = new Anthropic({ apiKey })
      const systemPrompt = mode === 'translation' ? TRANSLATE_PROMPT : GRAMMAR_PROMPT

      const message = await client.messages.create({
        model,
        max_tokens: mode === 'translation' ? 512 : 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: original }]
      })

      const first = message.content[0]
      const text = first?.type === 'text' ? (first.text ?? '') : ''
      if (!text) throw new Error('AI로부터 응답을 받지 못했습니다.')
      const result = JSON.parse(extractJson(text))

      setAnalysisCache(cacheKey, result)
      return result
    }
  )
}
