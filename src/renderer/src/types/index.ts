export interface Song {
  id: number
  title: string
  artist: string
  created_at: string
  word_count?: number
}

export interface LyricLine {
  id?: number
  song_id?: number
  line_index: number
  original: string
  reading: string
  translation: string
}

export interface VocabWord {
  id: number
  song_id: number | null
  song_title?: string
  word: string
  meaning: string
  created_at: string
  favorited: boolean
}

export type Page = 'home' | 'editor' | 'vocabulary'
