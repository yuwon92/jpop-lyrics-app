import { ipcMain } from 'electron'
import {
  getAllSongs,
  getSong,
  saveSong,
  deleteSong,
  getAllVocab,
  getVocabBySong,
  addVocab,
  deleteVocab,
  toggleFavorite
} from './database'

export function registerIpcHandlers(): void {
  ipcMain.handle('songs:get-all', () => getAllSongs())
  ipcMain.handle('songs:get-one', (_e, id: number) => getSong(id))
  ipcMain.handle('songs:save', (_e, payload) => saveSong(payload))
  ipcMain.handle('songs:delete', (_e, id: number) => deleteSong(id))

  ipcMain.handle('vocab:get-all', () => getAllVocab())
  ipcMain.handle('vocab:get-by-song', (_e, songId: number) => getVocabBySong(songId))
  ipcMain.handle('vocab:add', (_e, payload) => addVocab(payload))
  ipcMain.handle('vocab:delete', (_e, id: number) => deleteVocab(id))
  ipcMain.handle('vocab:toggle-favorite', (_e, id: number) => toggleFavorite(id))
}
