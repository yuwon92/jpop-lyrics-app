import { contextBridge, ipcRenderer } from 'electron'

const api = {
  convertReadingBulk: (lines: string[]): Promise<string[]> =>
    ipcRenderer.invoke('convert-reading-bulk', lines),

  anthropic: {
    hasKey: (): Promise<boolean> => ipcRenderer.invoke('anthropic:has-key'),
    setKey: (key: string): Promise<void> => ipcRenderer.invoke('anthropic:set-key', key),
    convertKorean: (lines: string[]): Promise<string[]> =>
      ipcRenderer.invoke('anthropic:convert-korean', lines),
    translateWord: (word: string): Promise<string> =>
      ipcRenderer.invoke('anthropic:translate-word', word)
  },

  songs: {
    getAll: () => ipcRenderer.invoke('songs:get-all'),
    getOne: (id: number) => ipcRenderer.invoke('songs:get-one', id),
    save: (payload: {
      id?: number
      title: string
      artist: string
      lines: unknown[]
    }) => ipcRenderer.invoke('songs:save', payload),
    delete: (id: number) => ipcRenderer.invoke('songs:delete', id),
    saveKoreanReadings: (payload: { songId: number; readings: string[] }) =>
      ipcRenderer.invoke('songs:save-korean-readings', payload)
  },

  vocab: {
    getAll: () => ipcRenderer.invoke('vocab:get-all'),
    getBySong: (songId: number) => ipcRenderer.invoke('vocab:get-by-song', songId),
    add: (payload: { song_id: number | null; word: string; reading?: string; meaning: string }) =>
      ipcRenderer.invoke('vocab:add', payload),
    update: (payload: { id: number; word: string; reading?: string; meaning: string }) =>
      ipcRenderer.invoke('vocab:update', payload),
    saveReadings: (entries: { id: number; reading: string }[]) =>
      ipcRenderer.invoke('vocab:save-readings', entries),
    delete: (id: number) => ipcRenderer.invoke('vocab:delete', id),
    toggleFavorite: (id: number) => ipcRenderer.invoke('vocab:toggle-favorite', id)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
