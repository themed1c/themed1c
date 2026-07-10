import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('lifeOS', {
  load: () => ipcRenderer.invoke('lifeos:load'),
  save: (patch: unknown) => ipcRenderer.invoke('lifeos:save', patch),
  aiComplete: (payload: unknown) => ipcRenderer.invoke('lifeos:ai', payload),
  show: () => ipcRenderer.invoke('lifeos:show'),
  setTitlebar: (colors: unknown) => ipcRenderer.invoke('lifeos:titlebar', colors),
  socialFetch: (req: unknown) => ipcRenderer.invoke('lifeos:social', req),
  wipeData: () => ipcRenderer.invoke('lifeos:wipe'),
  setAppIcon: (dataUrl: unknown) => ipcRenderer.invoke('lifeos:app-icon', dataUrl),
});
