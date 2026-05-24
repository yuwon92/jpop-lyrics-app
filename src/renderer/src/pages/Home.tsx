import React from 'react'
import RetroWindow from '../components/layout/RetroWindow'
import PixelButton from '../components/shared/PixelButton'
import { Song, Page } from '../types'
import './Home.css'

interface Props {
  songs: Song[]
  loading: boolean
  onNewSong: () => void
  onEditSong: (song: Song) => void
  onDeleteSong: (id: number) => void
}

export default function Home({ songs, loading, onNewSong, onEditSong, onDeleteSong }: Props): JSX.Element {
  return (
    <div className="home-page">
      <RetroWindow title="노래 목록" icon="♫" accent="pink" className="home-window">
        <div className="home-header">
          <p className="home-subtitle">번역한 J-Pop 가사를 모아보세요 ♡</p>
          <PixelButton variant="primary" onClick={onNewSong}>
            ✦ 새 노래 번역 시작
          </PixelButton>
        </div>

        <div className="home-body">
          {loading ? (
            <div className="home-empty">불러오는 중...</div>
          ) : songs.length === 0 ? (
            <div className="home-empty">
              <span className="home-empty__icon">♪</span>
              <span>아직 번역한 노래가 없어요</span>
              <span className="home-empty__hint">위의 버튼을 눌러 첫 번째 노래를 번역해보세요!</span>
            </div>
          ) : (
            <div className="home-grid">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onEdit={() => onEditSong(song)}
                  onDelete={() => onDeleteSong(song.id)}
                />
              ))}
            </div>
          )}
        </div>
      </RetroWindow>
    </div>
  )
}

function SongCard({
  song,
  onEdit,
  onDelete
}: {
  song: Song
  onEdit: () => void
  onDelete: () => void
}): JSX.Element {
  const date = song.created_at?.split(' ')[0] ?? ''

  return (
    <div className="song-card" onClick={onEdit}>
      <div className="song-card__header">
        <span className="song-card__note">♪</span>
        <div className="song-card__info">
          <div className="song-card__title jp-text">{song.title}</div>
          {song.artist && <div className="song-card__artist">{song.artist}</div>}
        </div>
        <button
          className="song-card__delete"
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(`"${song.title}"을(를) 삭제할까요?`)) {
              onDelete()
            }
          }}
          title="삭제"
        >
          ×
        </button>
      </div>
      <div className="song-card__footer">
        <span className="song-card__words">★ 단어 {song.word_count ?? 0}개</span>
        <span className="song-card__date">{date}</span>
      </div>
    </div>
  )
}
