// Get references to UI elements
const playPauseButton = document.getElementById('playPauseButton');
const volumeSlider = document.getElementById('volumeSlider');
const wwozAudio = document.getElementById('wwozAudio');
const streamStatus = document.getElementById('streamStatus');

let isPlaying = false;

// Play/Pause button logic
playPauseButton.addEventListener('click', () => {
  if (wwozAudio.paused) {
    wwozAudio.play();
  } else {
    wwozAudio.pause();
  }
});

// Volume slider logic
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
  if (!wwozAudio.paused) {
    streamStatus.textContent = 'Playing...';
  }
});
wwozAudio.addEventListener('error', () => {
  streamStatus.textContent = 'Error loading stream.';
});

// Optionally, set initial volume
wwozAudio.volume = parseFloat(volumeSlider.value);

// Prepare for future IPC (not used yet)
if (window.electron && window.electron.ipcRenderer) {
  // Example: window.electron.ipcRenderer.send('stream-status', 'Playing');
} 