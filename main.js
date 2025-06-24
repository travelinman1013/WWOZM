/*
 * main.js - Electron Main Process
 * --------------------------------
 * This file is the entry point for the Electron main process. It is responsible for:
 *   - Creating and managing the main application window
 *   - Handling application lifecycle events (ready, activate, window-all-closed)
 *   - Setting up IPC (Inter-Process Communication) listeners for communication between the main and renderer processes
 *   - Loading the renderer (index.html) into a BrowserWindow
 *   - Fetching and parsing the WWOZ archive list and archive playback pages
 *   - Creating pop-up player windows for archive playback
 *
 * The main process runs separately from the renderer process and has access to Node.js and Electron APIs.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow; // Reference to the main application window

// Function to create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
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

// --- IPC Handlers for Live Stream (placeholders for future logic) ---
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

// --- IPC: Fetch and parse the WWOZ archive list ---
ipcMain.handle('fetch-archive-list', async () => {
  // Helper to fetch HTML from a URL
  function fetchHTML(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  try {
    const archiveURL = 'https://www.wwoz.org/listen/archive/';
    const html = await fetchHTML(archiveURL);
    // Parse the HTML for archive entries (date, show name, playback page URL)
    // This is a simple regex-based parser for demonstration; a robust solution would use a real HTML parser.
    const archiveEntries = [];
    const entryRegex = /<a href="(\/listen\/archive\/[^"]+)"[^>]*>(.*?)<\/a>\s*<span class="date">([^<]+)<\/span>/g;
    let match;
    while ((match = entryRegex.exec(html)) !== null) {
      archiveEntries.push({
        url: 'https://www.wwoz.org' + match[1],
        showName: match[2].trim(),
        date: match[3].trim()
      });
    }
    return { success: true, entries: archiveEntries };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- IPC: Open a new archive player window for a specific archive show ---
ipcMain.on('open-archive-player', (event, archiveInfo) => {
  // Create a new BrowserWindow for the archive player
  const playerWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: `${archiveInfo.showName} (${archiveInfo.date})`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [
        `archiveShowName=${encodeURIComponent(archiveInfo.showName)}`,
        `archiveShowDate=${encodeURIComponent(archiveInfo.date)}`
      ]
    }
  });
  // Load the archive player HTML
  playerWindow.loadFile('archive-player.html');
  // Once the window is ready, send the archive playback page URL
  playerWindow.webContents.on('did-finish-load', () => {
    playerWindow.webContents.send('archive-playback-url', archiveInfo.url, archiveInfo.showName, archiveInfo.date);
  });
});

// --- IPC: Fetch and parse the archive playback page for the direct audio URL ---
ipcMain.handle('fetch-archive-audio-url', async (event, playbackPageUrl) => {
  function fetchHTML(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
  try {
    const html = await fetchHTML(playbackPageUrl);
    // Try to find a direct audio URL in an <audio> tag or a JS variable
    // First, look for <audio src="...">
    let audioUrlMatch = html.match(/<audio[^>]+src=["']([^"']+\.mp3)["']/i);
    if (audioUrlMatch) {
      return { success: true, audioUrl: audioUrlMatch[1] };
    }
    // Fallback: look for a JS variable or other pattern (customize as needed)
    let jsUrlMatch = html.match(/['"](https?:[^'"]+\.mp3)['"]/i);
    if (jsUrlMatch) {
      return { success: true, audioUrl: jsUrlMatch[1] };
    }
    return { success: false, error: 'No audio URL found in archive playback page.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}); 