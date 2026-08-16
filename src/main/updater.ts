import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

// 자동 업데이트는 Windows(NSIS) 전용 — macOS는 코드 서명이 없어
// Squirrel.Mac이 업데이트 적용을 거부하므로 수동 다운로드로 유지한다.
export function setupAutoUpdater(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return

  autoUpdater.on('update-downloaded', (info) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: '업데이트 준비 완료',
        message: `새 버전 v${info.version}이(가) 다운로드되었습니다.`,
        detail: '지금 재시작하면 업데이트가 적용됩니다. 나중에 앱을 종료할 때 자동으로 설치됩니다.',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        // quitAndInstall도 before-quit을 거치므로 flushDb가 먼저 실행된다
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  // 업데이트 확인 실패(오프라인 등)는 앱 사용에 지장이 없으므로 로그만 남긴다
  autoUpdater.on('error', (err) => console.error('[updater]', err))

  void autoUpdater.checkForUpdates()
}
