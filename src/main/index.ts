import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { getDb } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { setupKuroshiro, registerKuroshiroHandler } from './kuroshiro-handler'
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
      sandbox: false
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
      if (input.key === 'F12') window.webContents.openDevTools()
    })
  })

  getDb()
  registerIpcHandlers()
  registerAnthropicHandler()
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
