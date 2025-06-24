/*
 * archive-player-renderer.js - Electron Archive Player Renderer Script
 * -------------------------------------------------------------------
 * This file runs in the renderer process of the archive player pop-up window. It is responsible for:
 *   - Receiving the archive playback page URL, show name, and date via IPC from main.js
 *   - Fetching and parsing the playback page to extract the direct audio URL
 *   - Managing the UI: heading, play/pause, volume, and status
 *   - Handling audio playback and error states
 *   - Providing a clean, minimalist user experience
 */

// Get references to UI elements
const heading = document.getElementById('archiveShowHeading');
const playPauseButton = document.getElementById('archivePlayPauseButton');
const volumeSlider = document.getElementById('archiveVolumeSlider');
const audio = document.getElementById('archiveAudio');
const streamStatus = document.getElementById('archiveStreamStatus');

let isPlaying = false;
let audioUrl = null;

// Listen for the archive playback page URL and show info from main process
window.electron.ipcRenderer.on('archive-playback-url', async (event, playbackPageUrl, showName, showDate) => {
  heading.textContent = `${showName} (${showDate})`;
  streamStatus.textContent = 'Loading...';
  playPauseButton.disabled = true;
  volumeSlider.disabled = true;
  try {
    // Ask main process to fetch and parse the playback page for the direct audio URL
    const result = await window.electron.ipcRenderer.invoke('fetch-archive-audio-url', playbackPageUrl);
    if (!result.success) throw new Error(result.error);
    audioUrl = result.audioUrl;
    audio.src = audioUrl;
    playPauseButton.disabled = false;
    volumeSlider.disabled = false;
    streamStatus.textContent = 'Ready to play';
  } catch (err) {
    streamStatus.textContent = 'Error: ' + err.message;
    playPauseButton.disabled = true;
    volumeSlider.disabled = true;
  }
});

// Play/Pause button logic
playPauseButton.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

// Volume slider logic
volumeSlider.addEventListener('input', () => {
  audio.volume = parseFloat(volumeSlider.value);
});

audio.addEventListener('playing', () => {
  playPauseButton.textContent = 'Pause';
  streamStatus.textContent = 'Playing...';
  isPlaying = true;
});
audio.addEventListener('pause', () => {
  playPauseButton.textContent = 'Play';
  streamStatus.textContent = 'Paused';
  isPlaying = false;
});
audio.addEventListener('waiting', () => {
  streamStatus.textContent = 'Loading...';
});
audio.addEventListener('loadeddata', () => {
  if (!audio.paused) {
    streamStatus.textContent = 'Playing...';
  }
});
audio.addEventListener('error', () => {
  streamStatus.textContent = 'Error loading stream.';
});

// Set initial volume
audio.volume = parseFloat(volumeSlider.value); 