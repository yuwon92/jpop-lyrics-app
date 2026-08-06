import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { getDb, getCorruptBackupPath, flushDb } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { setupKuroshiro, registerKuroshiroHandler } from './kuroshiro-handler'
import { setupLemmaTokenizer, registerLemmaHandler } from './lemma-handler'
import { registerAnthropicHandler } from './anthropic-handler'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (_, input) => {
      if (isDev && input.key === 'F12') window.webContents.openDevTools()
    })
  })

  getDb()
  const corrupt = getCorruptBackupPath()
  if (corrupt) {
    dialog.showMessageBox({
      type: 'warning',
      title: '데이터 복구 안내',
      message: '저장 데이터를 읽을 수 없어 새로 시작합니다.',
      detail:
        `손상된 파일은 다음 위치에 보관했습니다:\n${corrupt}\n\n` +
        `같은 폴더의 jpop-lyrics-data.json.bak 파일을 jpop-lyrics-data.json으로 ` +
        `복사하면 마지막 정상 시점으로 복구할 수 있습니다.`
    })
  }
  registerIpcHandlers()
  registerAnthropicHandler()
  registerLemmaHandler()
  // 실패해도 앱 실행을 막지 않는다 — 추천 기능만 비활성화됨
  void setupLemmaTokenizer()
  await setupKuroshiro()
  registerKuroshiroHandler()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 디바운스로 대기 중인 저장이 있으면 종료 전에 반드시 디스크에 반영
app.on('before-quit', () => flushDb())
