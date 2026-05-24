import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface Song {
  id: number
  title: string
  artist: string
  created_at: string
}

export interface LyricLine {
  id: number
  song_id: number
  line_index: number
  original: string
  reading: string
  translation: string
}

export interface VocabWord {
  id: number
  song_id: number | null
  word: string
  meaning: string
  created_at: string
  favorited: boolean
}

interface DB {
  songs: Song[]
  lyric_lines: LyricLine[]
  vocabulary: VocabWord[]
  _nextId: { songs: number; lyric_lines: number; vocabulary: number }
}

let dbPath: string
let _db: DB | null = null

function getDbPath(): string {
  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'jpop-lyrics-data.json')
  }
  return dbPath
}

export function getDb(): DB {
  if (_db) return _db
  const p = getDbPath()
  if (fs.existsSync(p)) {
    try {
      _db = JSON.parse(fs.readFileSync(p, 'utf-8')) as DB
    } catch {
      _db = emptyDb()
    }
  } else {
    _db = emptyDb()
  }
  return _db
}

function emptyDb(): DB {
  return {
    songs: [],
    lyric_lines: [],
    vocabulary: [],
    _nextId: { songs: 1, lyric_lines: 1, vocabulary: 1 }
  }
}

export function saveDb(): void {
  if (!_db) return
  fs.writeFileSync(getDbPath(), JSON.stringify(_db, null, 2), 'utf-8')
}

function nextId(table: keyof DB['_nextId']): number {
  const db = getDb()
  const id = db._nextId[table]
  db._nextId[table]++
  return id
}

function now(): string {
  return new Date().toLocaleString('sv').replace('T', ' ')
}

// Songs
export function getAllSongs() {
  const db = getDb()
  return db.songs
    .map((s) => ({
      ...s,
      word_count: db.vocabulary.filter((v) => v.song_id === s.id).length
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getSong(id: number) {
  const db = getDb()
  const song = db.songs.find((s) => s.id === id)
  const lines = db.lyric_lines
    .filter((l) => l.song_id === id)
    .sort((a, b) => a.line_index - b.line_index)
  return { song, lines }
}

export function saveSong(payload: {
  id?: number
  title: string
  artist: string
  lines: Omit<LyricLine, 'id' | 'song_id'>[]
}): number {
  const db = getDb()
  let songId: number
  if (payload.id) {
    songId = payload.id
    const idx = db.songs.findIndex((s) => s.id === songId)
    if (idx !== -1) {
      db.songs[idx] = { ...db.songs[idx], title: payload.title, artist: payload.artist }
    }
    db.lyric_lines = db.lyric_lines.filter((l) => l.song_id !== songId)
  } else {
    songId = nextId('songs')
    db.songs.push({ id: songId, title: payload.title, artist: payload.artist, created_at: now() })
  }
  for (const line of payload.lines) {
    db.lyric_lines.push({
      id: nextId('lyric_lines'),
      song_id: songId,
      line_index: line.line_index,
      original: line.original,
      reading: line.reading,
      translation: line.translation
    })
  }
  saveDb()
  return songId
}

export function deleteSong(id: number): void {
  const db = getDb()
  db.songs = db.songs.filter((s) => s.id !== id)
  db.lyric_lines = db.lyric_lines.filter((l) => l.song_id !== id)
  db.vocabulary = db.vocabulary.map((v) => (v.song_id === id ? { ...v, song_id: null } : v))
  saveDb()
}

// Vocabulary
export function getAllVocab() {
  const db = getDb()
  return db.vocabulary
    .map((v) => ({
      ...v,
      song_title: db.songs.find((s) => s.id === v.song_id)?.title ?? null
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getVocabBySong(songId: number) {
  const db = getDb()
  const song = db.songs.find((s) => s.id === songId)
  return db.vocabulary
    .filter((v) => v.song_id === songId)
    .map((v) => ({ ...v, song_title: song?.title ?? null }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function addVocab(payload: {
  song_id: number | null
  word: string
  meaning: string
}): number {
  const db = getDb()
  const id = nextId('vocabulary')
  db.vocabulary.push({ id, song_id: payload.song_id, word: payload.word, meaning: payload.meaning, created_at: now(), favorited: false })
  saveDb()
  return id
}

export function toggleFavorite(id: number): boolean {
  const db = getDb()
  const word = db.vocabulary.find((v) => v.id === id)
  if (!word) return false
  word.favorited = !word.favorited
  saveDb()
  return word.favorited
}

export function deleteVocab(id: number): void {
  const db = getDb()
  db.vocabulary = db.vocabulary.filter((v) => v.id !== id)
  saveDb()
}
