/*
 * renderer.js - Electron Renderer Process Script
 * ---------------------------------------------
 * This file runs in the renderer process (the web page). It is responsible for:
 *   - Managing the UI and user interactions (navigation, play/pause, volume)
 *   - Directly controlling the <audio> element for both live and archive playback
 *   - Fetching and displaying the WWOZ 2-week archive list and playback
 *   - Updating the stream status display based on audio events
 *   - Securely requesting external HTML via IPC to the main process
 *
 * All DOM and browser APIs are available here.
 */

// --- UI Element References ---
// Navigation
const navLive = document.getElementById('navLive');
const navArchive = document.getElementById('navArchive');
// Views
const liveView = document.getElementById('liveView');
const archiveListView = document.getElementById('archiveListView');
const archivePlayerView = document.getElementById('archivePlayerView');
// Live controls
const playPauseButton = document.getElementById('playPauseButton');
const volumeSlider = document.getElementById('volumeSlider');
const streamStatus = document.getElementById('streamStatus');
// Archive list
const archiveList = document.getElementById('archiveList');
const archiveListLoading = document.getElementById('archiveListLoading');
// Archive player controls
const archiveShowTitle = document.getElementById('archiveShowTitle');
const archivePlayPauseButton = document.getElementById('archivePlayPauseButton');
const archiveVolumeSlider = document.getElementById('archiveVolumeSlider');
const archiveStreamStatus = document.getElementById('archiveStreamStatus');
const backToArchiveListBtn = document.getElementById('backToArchiveListBtn');
// Shared audio element
const wwozAudio = document.getElementById('wwozAudio');

// --- State ---
let currentView = 'live'; // 'live', 'archive-list', 'archive-player'
let isPlaying = false; // Track playback state
let lastLiveSrc = 'https://wwoz-sc.streamguys1.com/wwoz-hi.mp3';
let archiveEntries = []; // List of archive shows
let currentArchive = null; // { title, date, url, streamUrl }

// --- Navigation Logic ---
function showView(view) {
  // Hide all views
  liveView.classList.remove('active');
  archiveListView.classList.remove('active');
  archivePlayerView.classList.remove('active');
  navLive.classList.remove('active');
  navArchive.classList.remove('active');
  // Show selected view
  if (view === 'live') {
    liveView.classList.add('active');
    navLive.classList.add('active');
    currentView = 'live';
    // Restore live stream src if needed
    if (wwozAudio.src !== lastLiveSrc) {
      wwozAudio.src = lastLiveSrc;
      streamStatus.textContent = 'Paused';
      playPauseButton.textContent = 'Play';
    }
  } else if (view === 'archive-list') {
    archiveListView.classList.add('active');
    navArchive.classList.add('active');
    currentView = 'archive-list';
  } else if (view === 'archive-player') {
    archivePlayerView.classList.add('active');
    navArchive.classList.add('active');
    currentView = 'archive-player';
  }
}

navLive.addEventListener('click', () => {
  showView('live');
  wwozAudio.pause();
});
navArchive.addEventListener('click', () => {
  showView('archive-list');
  // Only fetch if not already loaded
  if (archiveEntries.length === 0) {
    fetchArchiveList();
  }
  wwozAudio.pause();
});

// --- Live Stream Controls ---
playPauseButton.addEventListener('click', () => {
  if (wwozAudio.paused) {
    wwozAudio.play();
  } else {
    wwozAudio.pause();
  }
});
volumeSlider.addEventListener('input', () => {
  wwozAudio.volume = parseFloat(volumeSlider.value);
});

// --- Archive List Fetching & Display ---
async function fetchArchiveList() {
  archiveListLoading.style.display = 'block';
  archiveList.innerHTML = '';
  try {
    const response = await window.electron.ipcRenderer.invoke('fetch-archive-url', 'https://www.wwoz.org/listen/archive/');
    if (!response.success) throw new Error(response.error);
    // Parse HTML to extract archive entries
    archiveEntries = parseArchiveListHTML(response.html);
    renderArchiveList();
  } catch (err) {
    archiveListLoading.textContent = 'Error loading archive: ' + err.message;
    archiveListLoading.style.display = 'block';
  }
}

function parseArchiveListHTML(html) {
  // Create a DOM parser using a hidden element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  // WWOZ archive entries are in <div class="views-row"> or similar
  const rows = tempDiv.querySelectorAll('.views-row, .archive-listing .show-listing');
  const entries = [];
  rows.forEach(row => {
    // Try to extract date, show name, and link
    let date = '';
    let showName = '';
    let url = '';
    // Date
    const dateEl = row.querySelector('.date, .archive-date, .show-date');
    if (dateEl) date = dateEl.textContent.trim();
    // Show name
    const showEl = row.querySelector('.show-title, .archive-title, .show-name, h3');
    if (showEl) showName = showEl.textContent.trim();
    // Link
    const linkEl = row.querySelector('a');
    if (linkEl && linkEl.href) url = linkEl.href;
    if (date && showName && url) {
      entries.push({ date, showName, url });
    }
  });
  return entries;
}

function renderArchiveList() {
  archiveListLoading.style.display = 'none';
  archiveList.innerHTML = '';
  if (archiveEntries.length === 0) {
    archiveList.innerHTML = '<li class="archive-list-loading">No archive shows found.</li>';
    return;
  }
  archiveEntries.forEach((entry, idx) => {
    const li = document.createElement('li');
    li.className = 'archive-list-item';
    li.innerHTML = `<span class="archive-show-title">${entry.showName}</span><span class="archive-show-date">${entry.date}</span>`;
    li.addEventListener('click', () => {
      startArchivePlayback(entry);
    });
    archiveList.appendChild(li);
  });
}

// --- Archive Playback Logic ---
async function startArchivePlayback(entry) {
  // Show loading in player view
  showView('archive-player');
  archiveShowTitle.textContent = `${entry.date} – ${entry.showName}`;
  archiveStreamStatus.textContent = 'Loading...';
  archivePlayPauseButton.textContent = 'Play';
  currentArchive = entry;
  try {
    const response = await window.electron.ipcRenderer.invoke('fetch-archive-url', entry.url);
    if (!response.success) throw new Error(response.error);
    // Parse HTML to find direct .mp3 or stream URL
    const streamUrl = parseArchivePlaybackHTML(response.html);
    if (!streamUrl) throw new Error('Could not find audio stream URL for this show.');
    currentArchive.streamUrl = streamUrl;
    wwozAudio.src = streamUrl;
    wwozAudio.play();
  } catch (err) {
    archiveStreamStatus.textContent = 'Error: ' + err.message;
    archivePlayPauseButton.disabled = true;
  }
}

function parseArchivePlaybackHTML(html) {
  // Try to find <audio src="..."> or a direct .mp3 URL in the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  // 1. Look for <audio src="...">
  const audioEl = tempDiv.querySelector('audio');
  if (audioEl && audioEl.src) return audioEl.src;
  // 2. Look for .mp3 in JavaScript variables or links
  const mp3Match = html.match(/https?:\\/\\/[^"'\s]+\.mp3/);
  if (mp3Match) return mp3Match[0].replace(/\\/g, '');
  // 3. Look for <source src="...">
  const sourceEl = tempDiv.querySelector('source');
  if (sourceEl && sourceEl.src) return sourceEl.src;
  return null;
}

// Archive player controls
archivePlayPauseButton.addEventListener('click', () => {
  if (wwozAudio.paused) {
    wwozAudio.play();
  } else {
    wwozAudio.pause();
  }
});
archiveVolumeSlider.addEventListener('input', () => {
  wwozAudio.volume = parseFloat(archiveVolumeSlider.value);
});
backToArchiveListBtn.addEventListener('click', () => {
  wwozAudio.pause();
  showView('archive-list');
});

// --- Shared Audio Element Event Listeners ---
wwozAudio.addEventListener('playing', () => {
  if (currentView === 'live') {
    playPauseButton.textContent = 'Pause';
    streamStatus.textContent = 'Playing...';
  } else if (currentView === 'archive-player') {
    archivePlayPauseButton.textContent = 'Pause';
    archiveStreamStatus.textContent = 'Playing...';
  }
  isPlaying = true;
});
wwozAudio.addEventListener('pause', () => {
  if (currentView === 'live') {
    playPauseButton.textContent = 'Play';
    streamStatus.textContent = 'Paused';
  } else if (currentView === 'archive-player') {
    archivePlayPauseButton.textContent = 'Play';
    archiveStreamStatus.textContent = 'Paused';
  }
  isPlaying = false;
});
wwozAudio.addEventListener('waiting', () => {
  if (currentView === 'live') {
    streamStatus.textContent = 'Loading...';
  } else if (currentView === 'archive-player') {
    archiveStreamStatus.textContent = 'Loading...';
  }
});
wwozAudio.addEventListener('loadeddata', () => {
  if (!wwozAudio.paused) {
    if (currentView === 'live') {
      streamStatus.textContent = 'Playing...';
    } else if (currentView === 'archive-player') {
      archiveStreamStatus.textContent = 'Playing...';
    }
  }
});
wwozAudio.addEventListener('error', () => {
  if (currentView === 'live') {
    streamStatus.textContent = 'Error loading stream.';
  } else if (currentView === 'archive-player') {
    archiveStreamStatus.textContent = 'Error loading stream.';
  }
});

// --- Initial Setup ---
wwozAudio.volume = parseFloat(volumeSlider.value);
archiveVolumeSlider.value = volumeSlider.value;

// Keep volume sliders in sync
volumeSlider.addEventListener('input', () => {
  archiveVolumeSlider.value = volumeSlider.value;
});
archiveVolumeSlider.addEventListener('input', () => {
  volumeSlider.value = archiveVolumeSlider.value;
});

// Prepare for future IPC (not used yet, but available via preload.js)
if (window.electron && window.electron.ipcRenderer) {
  // Example: window.electron.ipcRenderer.send('stream-status', 'Playing');
} 