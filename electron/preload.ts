import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lifeOS', {
  load: () => ipcRenderer.invoke('lifeos:load'),
  save: (patch: unknown) => ipcRenderer.invoke('lifeos:save', patch),
  aiComplete: (payload: unknown) => ipcRenderer.invoke('lifeos:ai', payload),
});
