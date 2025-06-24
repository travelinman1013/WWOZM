/*
 * renderer.js - Electron Renderer Process Script
 * ---------------------------------------------
 * This file runs in the renderer process (the web page). It is responsible for:
 *   - Managing the UI and user interactions (play/pause, volume)
 *   - Directly controlling the <audio> element for streaming audio
 *   - Updating the stream status display based on audio events
 *   - Fetching and displaying the WWOZ archive list
 *   - Handling tab navigation between Live and Archive
 *   - Requesting the main process to open archive player windows
 *   - Preparing for future IPC communication with the main process (via preload.js)
 *
 * All DOM and browser APIs are available here.
 */

// --- Tab Navigation ---
const liveTabBtn = document.getElementById('liveTabBtn');
const archiveTabBtn = document.getElementById('archiveTabBtn');
const liveSection = document.getElementById('liveSection');
const archiveSection = document.getElementById('archiveSection');

liveTabBtn.addEventListener('click', () => {
  liveTabBtn.classList.add('active');
  archiveTabBtn.classList.remove('active');
  liveSection.classList.add('active');
  archiveSection.classList.remove('active');
});
archiveTabBtn.addEventListener('click', () => {
  archiveTabBtn.classList.add('active');
  liveTabBtn.classList.remove('active');
  archiveSection.classList.add('active');
  liveSection.classList.remove('active');
});

// --- Live Stream Player Logic ---
const playPauseButton = document.getElementById('playPauseButton');
const volumeSlider = document.getElementById('volumeSlider');
const wwozAudio = document.getElementById('wwozAudio');
const streamStatus = document.getElementById('streamStatus');

let isPlaying = false; // Track playback state

// Play/Pause button logic: toggles audio playback
playPauseButton.addEventListener('click', () => {
  if (wwozAudio.paused) {
    wwozAudio.play();
  } else {
    wwozAudio.pause();
  }
});

// Volume slider logic: updates audio volume in real time
volumeSlider.addEventListener('input', () => {
  wwozAudio.volume = parseFloat(volumeSlider.value);
});

// Audio event listeners for status updates
wwozAudio.addEventListener('playing', () => {
  playPauseButton.textContent = 'Pause';
  streamStatus.textContent = 'Playing...';
  isPlaying = true;
});

wwozAudio.addEventListener('pause', () => {
  playPauseButton.textContent = 'Play';
  streamStatus.textContent = 'Paused';
  isPlaying = false;
});

wwozAudio.addEventListener('waiting', () => {
  streamStatus.textContent = 'Loading...';
});

wwozAudio.addEventListener('loadeddata', () => {
  // Only update if audio is not paused
  if (!wwozAudio.paused) {
    streamStatus.textContent = 'Playing...';
  }
});

wwozAudio.addEventListener('error', () => {
  streamStatus.textContent = 'Error loading stream.';
});

// Set initial volume to match slider value
wwozAudio.volume = parseFloat(volumeSlider.value);

// --- Archive Section Logic ---
const archiveList = document.getElementById('archiveList');
const archiveLoading = document.getElementById('archiveLoading');
const archiveError = document.getElementById('archiveError');

// Fetch and display the archive list when Archive tab is first shown
let archiveLoaded = false;
archiveTabBtn.addEventListener('click', () => {
  if (!archiveLoaded) {
    loadArchiveList();
    archiveLoaded = true;
  }
});

async function loadArchiveList() {
  archiveLoading.style.display = '';
  archiveError.style.display = 'none';
  archiveList.innerHTML = '';
  try {
    const result = await window.electron.ipcRenderer.invoke('fetch-archive-list');
    if (!result.success) throw new Error(result.error);
    if (result.entries.length === 0) {
      archiveLoading.textContent = 'No archive shows found.';
      return;
    }
    archiveLoading.style.display = 'none';
    result.entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'archive-entry';
      li.innerHTML = `<span class="archive-entry-title">${entry.showName}</span><span class="archive-entry-date">${entry.date}</span>`;
      li.addEventListener('click', () => {
        // Request main process to open a new archive player window
        window.electron.ipcRenderer.send('open-archive-player', entry);
      });
      archiveList.appendChild(li);
    });
  } catch (err) {
    archiveLoading.style.display = 'none';
    archiveError.style.display = '';
    archiveError.textContent = 'Error loading archive: ' + err.message;
  }
}

// Prepare for future IPC (not used yet, but available via preload.js)
if (window.electron && window.electron.ipcRenderer) {
  // Example: window.electron.ipcRenderer.send('stream-status', 'Playing');
} 