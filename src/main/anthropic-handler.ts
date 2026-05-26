import Anthropic from '@anthropic-ai/sdk'
import { ipcMain, safeStorage, app } from 'electron'
import path from 'path'
import fs from 'fs'

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
  }
}

export function registerAnthropicHandler(): void {
  ipcMain.handle('anthropic:has-key', () => getStoredApiKey() !== null)

  ipcMain.handle('anthropic:set-key', (_e, key: string) => {
    storeApiKey(key.trim())
  })

  ipcMain.handle('anthropic:convert-korean', async (_e, lines: string[]) => {
    const apiKey = getStoredApiKey()
    if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.')

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        '아래 일본어 가사를 한국어 발음 표기(한글)로 변환해.',
        '규칙:',
        '- 줄 수를 입력과 동일하게 유지해 (빈 줄 추가 금지)',
        '- 각 줄을 한글 발음으로만 출력 (설명, 번호, 기호 없음)',
        '- 일본어 원문이나 로마자는 절대 출력하지 마',
        '',
        '예시:',
        '입력: 夜に駆ける',
        '출력: 요루니 카케루',
        '',
        '입력: ただ過ぎる ノートの余白に書く',
        '출력: 다다 스기루 노-토노 요하쿠니 카쿠'
      ].join('\n'),
      messages: [{ role: 'user', content: lines.join('\n') }]
    })

    const first = message.content[0]
    const text = first?.type === 'text' ? first.text : ''
    const result = text.trim().split('\n').filter((l) => l.trim() !== '')
    return lines.map((_, i) => result[i] ?? '')
  })

  ipcMain.handle('anthropic:translate-word', async (_e, word: string) => {
    const apiKey = getStoredApiKey()
    if (!apiKey) throw new Error('NO_API_KEY')

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
    return (first?.type === 'text' ? first.text : '').trim()
  })
}
