import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import { openDatabase, type DBHandle } from './db';

let db: DBHandle;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
/** Mirrors settings.runInBackground; updated on every save from the renderer. */
let runInBackground = true;

const TRAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVR4nGNgoBbYUK/zn1RMkeZRA0YNGDUAiwGUAABRfcqe2bkWdQAAAABJRU5ErkJggg==';

interface AIPayload {
  provider?: 'anthropic' | 'openai';
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  apiKey: string;
  model: string;
}

/** The API key stays in the main process request; the renderer never talks to
 *  the network directly. */
async function aiComplete(payload: AIPayload): Promise<string> {
  return payload.provider === 'openai' ? openaiComplete(payload) : anthropicComplete(payload);
}

async function anthropicComplete(payload: AIPayload): Promise<string> {
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

async function openaiComplete(payload: AIPayload): Promise<string> {
  const messages = [
    ...(payload.system ? [{ role: 'system' as const, content: payload.system }] : []),
    ...payload.messages,
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify({ model: payload.model, messages }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null } }[];
  };
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new Error('request declined');
  const text = (msg?.content ?? '').trim();
  if (!text) throw new Error('empty response');
  return text;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 680,
    minHeight: 540,
    title: 'Life Organization',
    backgroundColor: '#FDFCF9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);

  // Background mode: closing the window hides to the tray instead of quitting.
  win.on('close', (e) => {
    if (runInBackground && !quitting) {
      e.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => {
    win = null;
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function showWindow() {
  if (win) {
    win.show();
    win.focus();
  } else {
    createWindow();
  }
}

function createTray() {
  tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
  tray.setToolTip('Life Organization');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showWindow);
}

app.whenReady().then(() => {
  db = openDatabase(app.getPath('userData'));
  try {
    const stored = db.load() as { settings?: { runInBackground?: boolean } } | null;
    runInBackground = stored?.settings?.runInBackground !== false;
  } catch {
    /* unreadable data must not stop the window from opening */
  }

  ipcMain.handle('lifeos:load', () => {
    try {
      return db.load();
    } catch {
      return null; // renderer falls back to seed rather than hanging forever
    }
  });
  ipcMain.handle('lifeos:save', (_event, patch: Record<string, unknown>) => {
    db.save(patch);
    const settings = patch.settings as { runInBackground?: boolean } | undefined;
    if (settings && typeof settings.runInBackground === 'boolean') {
      runInBackground = settings.runInBackground;
    }
  });
  ipcMain.handle('lifeos:ai', (_event, payload: AIPayload) => aiComplete(payload));

  createTray();
  createWindow();

  app.on('activate', () => {
    showWindow();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  // With background mode on, the hidden window never fully closes; if it does
  // (background off), quit like a normal app outside macOS.
  if (!runInBackground && process.platform !== 'darwin') app.quit();
});
