export interface Song {
  id: number
  title: string
  artist: string
  youtube_url?: string
  created_at: string
  word_count?: number
}

export interface LyricLine {
  id?: number
  song_id?: number
  line_index: number
  original: string
  reading: string
  reading_ko?: string
  translation: string
}

export interface VocabWord {
  id: number
  song_id: number | null
  song_title?: string
  word: string
  reading?: string
  meaning: string
  created_at: string
  favorited: boolean
}

export type Page = 'home' | 'editor' | 'vocabulary' | 'grammar-notes' | 'settings'

export interface GrammarNote {
  id: number
  song_id: number | null
  song_title?: string
  point: string
  explanation: string
  example: string
  created_at: string
  favorited: boolean
}

export interface TranslateResult {
  line: string
  literal: string
  free: string
}

export interface GrammarWord {
  word: string
  reading: string
  meaning: string
  pos: string
}

export interface GrammarResult {
  line: string
  words: GrammarWord[]
  grammar: { point: string; explanation: string }[]
}
