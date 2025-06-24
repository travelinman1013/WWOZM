/*
 * renderer.js - Electron Renderer Process Script
 * ---------------------------------------------
 * This file runs in the renderer process (the web page). It is responsible for:
 *   - Managing the UI and user interactions (play/pause, volume)
 *   - Directly controlling the <audio> element for streaming audio
 *   - Updating the stream status display based on audio events
 *   - Preparing for future IPC communication with the main process (via preload.js)
 *
 * All DOM and browser APIs are available here.
 */

// Get references to UI elements
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

// Prepare for future IPC (not used yet, but available via preload.js)
if (window.electron && window.electron.ipcRenderer) {
  // Example: window.electron.ipcRenderer.send('stream-status', 'Playing');
} 