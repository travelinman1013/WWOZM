/*
 * main.js - Electron Main Process
 * --------------------------------
 * This file is the entry point for the Electron main process. It is responsible for:
 *   - Creating and managing the main application window
 *   - Handling application lifecycle events (ready, activate, window-all-closed)
 *   - Setting up IPC (Inter-Process Communication) listeners for future communication between the main and renderer processes
 *   - Loading the renderer (index.html) into a BrowserWindow
 *   - Fetching external web content (archive pages) securely on behalf of the renderer
 *
 * The main process runs separately from the renderer process and has access to Node.js and Electron APIs.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');

let mainWindow; // Reference to the main application window

// Function to create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Preload script for secure context bridging
      nodeIntegration: false, // Security: do not allow Node.js integration in renderer
      contextIsolation: true  // Security: isolate context between main and renderer
    }
  });

  // Load the renderer HTML file into the window
  mainWindow.loadFile('index.html');
}

// App ready event: create the window
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create a window when the dock icon is clicked and there are no other windows open
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit the app when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC bridge for future extensions (currently placeholders)
ipcMain.on('play-stream', (event) => {
  // Placeholder for future logic to handle play-stream command from renderer
});
ipcMain.on('pause-stream', (event) => {
  // Placeholder for future logic to handle pause-stream command from renderer
});
ipcMain.on('set-volume', (event, volume) => {
  // Placeholder for future logic to handle set-volume command from renderer
});
ipcMain.on('stream-status', (event, status) => {
  // Placeholder for future logic to handle stream-status updates from renderer
});

// --- Archive: IPC for fetching external HTML content securely ---
/**
 * Fetches the HTML content of a given URL and returns it to the renderer process.
 * Listens for 'fetch-archive-url' IPC messages from the renderer.
 * Responds with 'archive-url-response' and the HTML or error.
 */
ipcMain.handle('fetch-archive-url', async (event, url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ success: true, html: data });
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}); 