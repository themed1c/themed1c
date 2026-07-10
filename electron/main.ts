import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { openDatabase, type DBHandle } from './db';

let db: DBHandle;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
/** Mirrors settings.runInBackground; updated on every save from the renderer. */
let runInBackground = true;

const TRAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVR4nGNgoBbYUK/zn1RMkeZRA0YNGDUAiwGUAABRfcqe2bkWdQAAAABJRU5ErkJggg==';

/** Bundled brand icon; the tray and window use it, and a connected social
 *  account's profile picture can replace it at runtime. */
function defaultIcon(): Electron.NativeImage {
  const p = path.join(__dirname, '..', 'build', 'icon.png');
  if (fs.existsSync(p)) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) return img;
  }
  return nativeImage.createFromDataURL(TRAY_ICON);
}

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

/* ---------------- social profile reads (read-only, deliberately rare) ------
 * One plain GET of a public profile, the same request a browser makes when a
 * person visits the page. No sign-in, no cookies, no retries, no crawling, and
 * nothing is ever posted, liked, or followed. The renderer enforces long
 * cooldowns between reads. Both platforms reject requests that do not carry
 * ordinary browser headers, so we send exactly those and nothing more. */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface SocialResult {
  displayName: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number | null;
  posts: number;
  likes: number | null;
  handle: string;
}

/** No such public account. */
class NotFoundError extends Error {}
/** The platform turned the request away (rate limit, bot check, login wall). */
class BlockedError extends Error {}

const asNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

async function fetchAvatar(url: string): Promise<string> {
  if (!url) return '';
  try {
    const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA } });
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 2_000_000) return '';
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return ''; // the numbers still matter without a picture
  }
}

async function instagramProfile(handle: string): Promise<SocialResult> {
  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    {
      headers: {
        'user-agent': BROWSER_UA,
        'x-ig-app-id': '936619743392459',
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        // Instagram answers "SecFetch Policy violation" without these.
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        referer: 'https://www.instagram.com/',
      },
    },
  );
  if (res.status === 404) throw new NotFoundError(handle);
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    throw new BlockedError(`instagram ${res.status}`);
  }
  if (!res.ok) throw new Error(`instagram ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as {
    data?: {
      user?: {
        full_name?: string;
        biography?: string;
        profile_pic_url_hd?: string;
        profile_pic_url?: string;
        edge_followed_by?: { count?: number };
        edge_follow?: { count?: number };
        edge_owner_to_timeline_media?: { count?: number };
      } | null;
    };
  };
  // A 200 with a null user is Instagram's "no such account".
  if (!data.data) throw new BlockedError('instagram shape');
  const u = data.data.user;
  if (!u) throw new NotFoundError(handle);
  return {
    handle,
    displayName: asStr(u.full_name) || handle,
    bio: asStr(u.biography),
    avatar: await fetchAvatar(asStr(u.profile_pic_url_hd) || asStr(u.profile_pic_url)),
    followers: asNum(u.edge_followed_by?.count),
    following: asNum(u.edge_follow?.count),
    posts: asNum(u.edge_owner_to_timeline_media?.count),
    likes: null,
  };
}

async function tiktokProfile(handle: string): Promise<SocialResult> {
  const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
    headers: {
      'user-agent': BROWSER_UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
      'upgrade-insecure-requests': '1',
    },
  });
  if (res.status === 404) throw new NotFoundError(handle);
  if (res.status === 403 || res.status === 429) throw new BlockedError(`tiktok ${res.status}`);
  if (!res.ok) throw new Error(`tiktok ${res.status}`);
  const html = await res.text();
  const m = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  // Missing payload means a bot check or a page redesign, not a missing user.
  if (!m) throw new BlockedError('tiktok shape');
  let scope: Record<string, unknown> | undefined;
  try {
    scope = (JSON.parse(m[1]) as { __DEFAULT_SCOPE__?: Record<string, unknown> }).__DEFAULT_SCOPE__;
  } catch {
    throw new BlockedError('tiktok shape');
  }
  const detail = scope?.['webapp.user-detail'] as
    | {
        statusCode?: number;
        userInfo?: {
          user?: { nickname?: string; signature?: string; avatarLarger?: string; avatarMedium?: string };
          stats?: { followerCount?: number; followingCount?: number; heartCount?: number; videoCount?: number };
        };
      }
    | undefined;
  if (!detail) throw new BlockedError('tiktok shape');
  if (detail.statusCode && detail.statusCode !== 0) throw new NotFoundError(handle);
  const user = detail.userInfo?.user;
  const stats = detail.userInfo?.stats;
  if (!user || !stats) throw new NotFoundError(handle);
  return {
    handle,
    displayName: asStr(user.nickname) || handle,
    bio: asStr(user.signature),
    avatar: await fetchAvatar(asStr(user.avatarLarger) || asStr(user.avatarMedium)),
    followers: asNum(stats.followerCount),
    following: asNum(stats.followingCount),
    posts: asNum(stats.videoCount),
    likes: asNum(stats.heartCount),
  };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 680,
    minHeight: 540,
    title: 'Life.Org',
    backgroundColor: '#FDFCF9',
    icon: defaultIcon(),
    // Custom title bar: the app draws its own slim bar; the OS window
    // controls float on top and get recolored when the theme changes.
    ...(process.platform !== 'linux'
      ? {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: { color: '#FDFCF9', symbolColor: '#7E7663', height: 36 },
        }
      : {}),
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
  tray = new Tray(defaultIcon().resize({ width: 16, height: 16 }));
  tray.setToolTip('Life.Org');
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

/** The app used to be named "Life Organization"; the rename to Life.Org moved
 *  the userData directory. Anyone upgrading has their database in the old
 *  folder, so the first launch under the new name carries it across. */
function migrateOldUserData(userData: string) {
  try {
    const newDb = path.join(userData, 'life-org.db');
    if (fs.existsSync(newDb)) return;
    const oldDir = path.join(path.dirname(userData), 'Life Organization');
    const oldDb = path.join(oldDir, 'life-org.db');
    if (!fs.existsSync(oldDb)) return;
    fs.mkdirSync(userData, { recursive: true });
    // WAL sidecars hold writes not yet folded into the main file.
    for (const suffix of ['', '-wal', '-shm']) {
      const from = oldDb + suffix;
      if (fs.existsSync(from)) fs.copyFileSync(from, newDb + suffix);
    }
  } catch {
    /* a failed migration starts fresh rather than blocking launch */
  }
}

app.whenReady().then(() => {
  // Windows toast notifications need a stable app identity.
  app.setAppUserModelId('com.lifeorganization.app');
  migrateOldUserData(app.getPath('userData'));
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
  ipcMain.handle('lifeos:show', () => showWindow());
  ipcMain.handle('lifeos:wipe', () => {
    db.wipe();
  });
  ipcMain.handle('lifeos:titlebar', (_event, colors: { color?: string; symbolColor?: string }) => {
    try {
      win?.setTitleBarOverlay?.({
        color: colors?.color,
        symbolColor: colors?.symbolColor,
        height: 36,
      });
    } catch {
      /* not supported on this platform */
    }
  });
  ipcMain.handle(
    'lifeos:social',
    async (_event, req: { platform?: string; handle?: string }): Promise<SocialResult> => {
      const handle = (req?.handle ?? '').trim().replace(/^@+/, '');
      if (!handle) throw new Error('NOTFOUND: no handle');
      try {
        return req?.platform === 'tiktok'
          ? await tiktokProfile(handle)
          : await instagramProfile(handle);
      } catch (e) {
        // Tag the failure kind so the renderer can name the real problem.
        if (e instanceof NotFoundError) throw new Error(`NOTFOUND: ${e.message}`);
        if (e instanceof BlockedError) throw new Error(`BLOCKED: ${e.message}`);
        throw e;
      }
    },
  );
  ipcMain.handle('lifeos:app-icon', (_event, dataUrl: unknown) => {
    try {
      const img =
        typeof dataUrl === 'string' && dataUrl
          ? nativeImage.createFromDataURL(dataUrl)
          : defaultIcon();
      if (!img.isEmpty()) {
        win?.setIcon(img);
        tray?.setImage(img.resize({ width: 16, height: 16 }));
      }
    } catch {
      /* a bad image must never take the window down */
    }
  });

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
