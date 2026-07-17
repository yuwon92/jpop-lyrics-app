import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let testDir: string

vi.mock('electron', () => ({
  app: {
    getPath: () => testDir
  }
}))

const DATA_FILE = 'jpop-lyrics-data.json'

/** 모듈 상태(_db 캐시, dbPath 메모이즈)를 초기화한 새 database 모듈을 로드 */
async function loadDb(): Promise<typeof import('./database')> {
  vi.resetModules()
  return import('./database')
}

function dataPath(): string {
  return path.join(testDir, DATA_FILE)
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jpop-db-test-'))
})

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true })
})

describe('getDb', () => {
  it('파일이 없으면 빈 DB 구조를 반환한다', async () => {
    const db = await loadDb()
    const state = db.getDb()
    expect(state.songs).toEqual([])
    expect(state.lyric_lines).toEqual([])
    expect(state.vocabulary).toEqual([])
    expect(state.grammar_notes).toEqual([])
    expect(state._nextId.songs).toBe(1)
  })

  it('정상 파일 로드 시 .bak 스냅샷을 남긴다', async () => {
    const first = await loadDb()
    first.saveSong({ title: '曲', artist: 'A', lines: [] })

    const second = await loadDb()
    second.getDb()
    expect(fs.existsSync(dataPath() + '.bak')).toBe(true)
    const bak = JSON.parse(fs.readFileSync(dataPath() + '.bak', 'utf-8'))
    expect(bak.songs).toHaveLength(1)
  })

  it('손상된 파일은 .corrupt-*로 보존하고 빈 DB로 시작한다', async () => {
    fs.writeFileSync(dataPath(), '{invalid json', 'utf-8')

    const db = await loadDb()
    const state = db.getDb()
    expect(state.songs).toEqual([])
    expect(db.getCorruptBackupPath()).not.toBeNull()
    expect(fs.existsSync(db.getCorruptBackupPath()!)).toBe(true)
    expect(fs.readFileSync(db.getCorruptBackupPath()!, 'utf-8')).toBe('{invalid json')
    // 원본 자리는 비워짐 (다음 저장 시 새로 생성)
    expect(fs.existsSync(dataPath())).toBe(false)
  })

  it('정상 로드 시 corruptBackupPath는 null이다', async () => {
    const db = await loadDb()
    db.getDb()
    expect(db.getCorruptBackupPath()).toBeNull()
  })
})

describe('saveDb (원자적 쓰기)', () => {
  it('저장 후 .tmp 잔여물 없이 유효한 JSON이 남는다', async () => {
    const db = await loadDb()
    db.saveSong({ title: '曲', artist: 'A', lines: [] })

    expect(fs.existsSync(dataPath())).toBe(true)
    expect(fs.existsSync(dataPath() + '.tmp')).toBe(false)
    const parsed = JSON.parse(fs.readFileSync(dataPath(), 'utf-8'))
    expect(parsed.songs).toHaveLength(1)
  })
})

describe('songs', () => {
  it('saveSong → getSong 라운드트립 (id 발급, lines 정렬)', async () => {
    const db = await loadDb()
    const id = db.saveSong({
      title: 'テスト曲',
      artist: 'テスト歌手',
      lines: [
        { line_index: 1, original: '二行目', reading: 'にぎょうめ', translation: '둘째 줄' },
        { line_index: 0, original: '一行目', reading: 'いちぎょうめ', translation: '첫째 줄' }
      ]
    })

    expect(id).toBe(1)
    const { song, lines } = db.getSong(id)
    expect(song?.title).toBe('テスト曲')
    expect(lines.map((l) => l.original)).toEqual(['一行目', '二行目'])
  })

  it('기존 id로 saveSong하면 곡 정보와 가사가 교체된다', async () => {
    const db = await loadDb()
    const id = db.saveSong({
      title: '원제',
      artist: 'A',
      lines: [{ line_index: 0, original: '旧', reading: '', translation: '' }]
    })
    db.saveSong({
      id,
      title: '수정제',
      artist: 'B',
      lines: [{ line_index: 0, original: '新', reading: '', translation: '' }]
    })

    const { song, lines } = db.getSong(id)
    expect(song?.title).toBe('수정제')
    expect(lines).toHaveLength(1)
    expect(lines[0].original).toBe('新')
  })

  it('deleteSong 시 해당 곡 단어의 song_id가 null이 된다 (단어는 유지)', async () => {
    const db = await loadDb()
    const songId = db.saveSong({ title: '曲', artist: 'A', lines: [] })
    db.addVocab({ song_id: songId, word: '言葉', meaning: '말' })
    db.addVocab({ song_id: null, word: '夢', meaning: '꿈' })

    db.deleteSong(songId)

    expect(db.getSong(songId).song).toBeUndefined()
    const vocab = db.getAllVocab()
    expect(vocab).toHaveLength(2)
    expect(vocab.every((v) => v.song_id === null)).toBe(true)
  })
})

describe('vocabulary', () => {
  it('addVocab → getAllVocab에 곡 제목이 조인된다', async () => {
    const db = await loadDb()
    const songId = db.saveSong({ title: '曲名', artist: 'A', lines: [] })
    db.addVocab({ song_id: songId, word: '恋', reading: 'こい', meaning: '사랑' })

    const vocab = db.getAllVocab()
    expect(vocab).toHaveLength(1)
    expect(vocab[0].song_title).toBe('曲名')
    expect(vocab[0].favorited).toBe(false)
  })

  it('toggleFavorite가 상태를 토글하고 결과를 반환한다', async () => {
    const db = await loadDb()
    const id = db.addVocab({ song_id: null, word: '空', meaning: '하늘' })
    expect(db.toggleFavorite(id)).toBe(true)
    expect(db.toggleFavorite(id)).toBe(false)
    expect(db.toggleFavorite(9999)).toBe(false)
  })
})

describe('데이터 지속성', () => {
  it('저장한 데이터가 모듈 재로드 후에도 유지된다', async () => {
    const first = await loadDb()
    const songId = first.saveSong({
      title: '残る曲',
      artist: 'A',
      lines: [{ line_index: 0, original: '歌詞', reading: 'かし', translation: '가사' }]
    })
    first.addVocab({ song_id: songId, word: '歌詞', meaning: '가사' })

    const second = await loadDb()
    const { song, lines } = second.getSong(songId)
    expect(song?.title).toBe('残る曲')
    expect(lines).toHaveLength(1)
    expect(second.getAllVocab()).toHaveLength(1)
    // id 카운터도 이어짐
    const newId = second.saveSong({ title: '新曲', artist: 'B', lines: [] })
    expect(newId).toBe(songId + 1)
  })
})
