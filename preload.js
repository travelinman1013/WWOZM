/*
 * preload.js - Electron Preload Script
 * -----------------------------------
 * This file runs in the context of the renderer process before any web content is loaded.
 * It is used to safely expose a limited set of Node.js/Electron APIs to the renderer via contextBridge,
 * enabling secure IPC (Inter-Process Communication) between the renderer and main processes.
 *
 * This is necessary because contextIsolation is enabled for security.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process for IPC
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // Send an IPC message to the main process
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    // Listen for IPC messages from the main process
    on: (channel, listener) => ipcRenderer.on(channel, listener)
  }
}); 