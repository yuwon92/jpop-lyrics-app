import { ipcMain } from 'electron'

let kuroshiro: unknown = null

export async function setupKuroshiro(): Promise<void> {
  try {
    // CJS/ESM interop: kuroshiro & kuromoji may export .default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KuroshiroMod = require('kuroshiro')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KuromojiMod = require('kuroshiro-analyzer-kuromoji')

    const KuroshiroClass = KuroshiroMod.default ?? KuroshiroMod
    const KuromojiClass = KuromojiMod.default ?? KuromojiMod

    const instance = new KuroshiroClass()
    await instance.init(new KuromojiClass())
    kuroshiro = instance
  } catch (err) {
    console.error('[kuroshiro] 초기화 실패:', err)
  }
}

export function registerKuroshiroHandler(): void {
  ipcMain.handle('convert-reading-bulk', async (_e, lines: string[]) => {
    if (!kuroshiro) return lines
    const k = kuroshiro as { convert: (text: string, opts: object) => Promise<string> }
    const results: string[] = []
    for (const line of lines) {
      try {
        const result = await k.convert(line, { to: 'hiragana', mode: 'normal' })
        results.push(result)
      } catch {
        results.push(line)
      }
    }
    return results
  })
}
