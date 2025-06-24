const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 350,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC bridge for future extensions
ipcMain.on('play-stream', (event) => {
  // Placeholder for future logic
});
ipcMain.on('pause-stream', (event) => {
  // Placeholder for future logic
});
ipcMain.on('set-volume', (event, volume) => {
  // Placeholder for future logic
});
ipcMain.on('stream-status', (event, status) => {
  // Placeholder for future logic
}); 