import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { openDatabase, type DBHandle } from './db';

let db: DBHandle;

interface AIPayload {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  apiKey: string;
  model: string;
}

/** The API key stays in the main process request; the renderer never talks to
 *  the network directly. */
async function aiComplete(payload: AIPayload): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': payload.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: payload.model,
      max_tokens: 1024,
      system: payload.system,
      messages: payload.messages,
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (data.stop_reason === 'refusal') throw new Error('request declined');
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
  if (!text) throw new Error('empty response');
  return text;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 640,
    title: 'Life Organization',
    backgroundColor: '#FDFCF9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  db = openDatabase(app.getPath('userData'));

  ipcMain.handle('lifeos:load', () => db.load());
  ipcMain.handle('lifeos:save', (_event, patch: Record<string, unknown>) => {
    db.save(patch);
  });
  ipcMain.handle('lifeos:ai', (_event, payload: AIPayload) => aiComplete(payload));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
