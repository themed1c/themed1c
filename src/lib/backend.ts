import type { ChatTurn, PersistedState, SocialFetchResult, SocialPlatform } from './types';
import { seedState } from './seed';

export interface AICompletePayload {
  /** Which API vendor to call; the key/model pair matches the vendor. */
  provider: 'anthropic' | 'openai';
  system: string;
  messages: ChatTurn[];
  apiKey: string;
  model: string;
}

/** Storage + privileged-network boundary. The Electron implementation lives in
 *  the main process (SQLite on disk, API calls without CORS); the browser
 *  implementation keeps the app fully usable in a plain dev server. */
export interface Backend {
  kind: 'electron' | 'browser';
  load(): Promise<PersistedState>;
  save(patch: Partial<PersistedState>): Promise<void>;
  /** Calls the configured completions API with the key from settings. */
  aiComplete(payload: AICompletePayload): Promise<string>;
}

interface LifeOSBridge {
  load(): Promise<PersistedState | null>;
  save(patch: Partial<PersistedState>): Promise<void>;
  aiComplete(payload: AICompletePayload): Promise<string>;
  /** Bring the (possibly tray-hidden) window to the front. */
  show?(): Promise<void>;
  /** Recolor the native window-control overlay to match the theme. */
  setTitlebar?(colors: { color: string; symbolColor: string }): Promise<void>;
  /** One read of a public social profile, from the main process. */
  socialFetch?(req: {
    platform: SocialPlatform;
    handle: string;
  }): Promise<SocialFetchResult & { handle: string }>;
  /** Set the window/tray icon; an empty string restores the default. */
  setAppIcon?(dataUrl: string): Promise<void>;
  /** Empty every table in the local database. */
  wipeData?(): Promise<void>;
}

declare global {
  interface Window {
    lifeOS?: LifeOSBridge;
  }
}

/** Fill anything a stored (possibly older) snapshot is missing from the seed.
 *  Settings merge field-by-field so new options get their defaults instead of
 *  coming back undefined for existing data. Keys carrying undefined (possible
 *  from older Electron databases over IPC) are dropped so they cannot shadow
 *  the seed defaults. */
function withDefaults(loaded: Partial<PersistedState>): PersistedState {
  const seed = seedState();
  const clean = Object.fromEntries(
    Object.entries(loaded).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<PersistedState>;
  return {
    ...seed,
    ...clean,
    settings: { ...seed.settings, ...(clean.settings ?? {}) },
  };
}

class ElectronBackend implements Backend {
  kind = 'electron' as const;
  private bridge: LifeOSBridge;

  constructor(bridge: LifeOSBridge) {
    this.bridge = bridge;
  }

  async load(): Promise<PersistedState> {
    const loaded = await this.bridge.load();
    hadLocalData = !!loaded;
    if (loaded) return withDefaults(loaded);
    const seed = seedState();
    await this.bridge.save(seed);
    return seed;
  }

  save(patch: Partial<PersistedState>): Promise<void> {
    return this.bridge.save(patch);
  }

  aiComplete(payload: AICompletePayload): Promise<string> {
    return this.bridge.aiComplete(payload);
  }
}

const LS_KEY = 'life-org-v2';

/** Last full state this session has seen: the safety net that prevents a
 *  corrupted localStorage read from truncating everything to one patch. */
let memoryFull: Partial<PersistedState> = {};

class BrowserBackend implements Backend {
  kind = 'browser' as const;

  async load(): Promise<PersistedState> {
    // Best-effort ask for durable storage (protects against automatic
    // eviction; explicit wipes are covered by the live data file below).
    try {
      void navigator.storage?.persist?.();
    } catch {
      /* not available on this browser */
    }
    await initDataFile();
    let local: Partial<PersistedState> | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) local = JSON.parse(raw) as Partial<PersistedState>;
    } catch {
      /* corrupted or unavailable storage */
    }
    hadLocalData = !!local;
    // If the browser was wiped but a live data file is already readable,
    // recover from the file without any user action, and write it straight
    // back into localStorage so later saves merge over the full state.
    if (!local) {
      const fromFile = await readDataFile();
      if (fromFile) {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(fromFile));
          hadLocalData = true;
        } catch {
          /* storage still unavailable; memoryFull covers this session */
        }
        memoryFull = fromFile;
        return withDefaults(fromFile);
      }
    }
    memoryFull = local ?? {};
    return local ? withDefaults(local) : seedState();
  }

  async save(patch: Partial<PersistedState>): Promise<void> {
    let current: Partial<PersistedState> | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) current = JSON.parse(raw) as Partial<PersistedState>;
    } catch {
      /* unreadable right now: fall back to this session's last known state */
    }
    const full = { ...(current ?? memoryFull), ...patch };
    memoryFull = full;
    localStorage.setItem(LS_KEY, JSON.stringify(full));
    scheduleDataFileWrite(full as PersistedState);
  }

  aiComplete(payload: AICompletePayload): Promise<string> {
    return payload.provider === 'openai' ? openaiComplete(payload) : anthropicComplete(payload);
  }
}

async function anthropicComplete(payload: AICompletePayload): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': payload.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
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

async function openaiComplete(payload: AICompletePayload): Promise<string> {
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

export function createBackend(): Backend {
  if (window.lifeOS) return new ElectronBackend(window.lifeOS);
  return new BrowserBackend();
}

/* ---------------- live data file (browser mode, Chromium only) ----------------
 * Browser site data can be wiped by cleanup tools ("clear cookies and site
 * data", CCleaner). The live data file mirrors every save into a real file the
 * user picked on disk via the File System Access API, so a wipe costs nothing:
 * the file survives and can be reconnected or restored. The file handle is
 * remembered in IndexedDB; browsers usually re-ask permission per session,
 * which surfaces in the UI as a one-click "Reconnect" banner. */

type Perm = 'granted' | 'denied' | 'prompt';

interface DataFileHandle {
  readonly name: string;
  queryPermission(d: { mode: 'readwrite' }): Promise<Perm>;
  requestPermission(d: { mode: 'readwrite' }): Promise<Perm>;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

declare global {
  interface Window {
    showSaveFilePicker?(opts?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }): Promise<DataFileHandle>;
  }
}

const IDB_NAME = 'life-org-file';
const IDB_STORE = 'kv';
const IDB_KEY = 'data-file-handle';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openIDB();
    return await new Promise((resolve, reject) => {
      const rq = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      rq.onsuccess = () => resolve(rq.result as T);
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const rq = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      rq.onsuccess = () => resolve();
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    /* IndexedDB unavailable: the feature quietly degrades to backups */
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const rq = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key);
      rq.onsuccess = () => resolve();
      rq.onerror = () => reject(rq.error);
    });
  } catch {
    /* nothing to clean up */
  }
}

let dataFile: DataFileHandle | null = null;
let dataFilePerm: Perm = 'prompt';
let hadLocalData = false;

export function dataFileSupported(): boolean {
  return typeof window.showSaveFilePicker === 'function' && !window.lifeOS;
}

export function getDataFileState(): { status: 'off' | 'on' | 'reconnect'; name: string | null } {
  if (!dataFile) return { status: 'off', name: null };
  return { status: dataFilePerm === 'granted' ? 'on' : 'reconnect', name: dataFile.name };
}

/** True when this browser still held saved data at startup (i.e. no wipe). */
export function hadStoredLocalData(): boolean {
  return hadLocalData;
}

async function initDataFile(): Promise<void> {
  if (!dataFileSupported()) return;
  const handle = await idbGet<DataFileHandle>(IDB_KEY);
  if (!handle || typeof handle.queryPermission !== 'function') return;
  dataFile = handle;
  try {
    dataFilePerm = await handle.queryPermission({ mode: 'readwrite' });
  } catch {
    dataFilePerm = 'prompt';
  }
}

async function readDataFile(): Promise<Partial<PersistedState> | null> {
  if (!dataFile || dataFilePerm !== 'granted') return null;
  try {
    const text = await (await dataFile.getFile()).text();
    const parsed = JSON.parse(text) as Partial<PersistedState>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

let writeTimer: ReturnType<typeof setTimeout> | undefined;
let pendingWrite: PersistedState | null = null;

async function writeNow(state: PersistedState): Promise<void> {
  if (!dataFile || dataFilePerm !== 'granted') return;
  try {
    const w = await dataFile.createWritable();
    await w.write(JSON.stringify(state, null, 2));
    await w.close();
  } catch {
    /* file busy or moved; localStorage still holds everything */
  }
}

function scheduleDataFileWrite(state: PersistedState): void {
  if (!dataFile || dataFilePerm !== 'granted') return;
  pendingWrite = state;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const s = pendingWrite;
    pendingWrite = null;
    if (s) void writeNow(s);
  }, 800);
}

/** Immediate mirror of the full current state into the connected file. */
export function pushDataFile(state: PersistedState): void {
  void writeNow(state);
}

/** Ask the user where to keep the live data file, then write to it. */
export async function connectDataFile(current: PersistedState): Promise<boolean> {
  if (!window.showSaveFilePicker) return false;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'Life Organization Data.json',
      types: [{ description: 'Life Organization data', accept: { 'application/json': ['.json'] } }],
    });
    dataFile = handle;
    dataFilePerm = 'granted';
    await idbSet(IDB_KEY, handle);
    await writeNow(current);
    return true;
  } catch {
    return false; // picker dismissed
  }
}

/** Re-grant permission on the remembered file. Returns the file's contents so
 *  the caller can recover from a wiped browser, or null if nothing readable. */
export async function reconnectDataFile(): Promise<{
  granted: boolean;
  fileState: Partial<PersistedState> | null;
}> {
  if (!dataFile) return { granted: false, fileState: null };
  try {
    dataFilePerm = await dataFile.requestPermission({ mode: 'readwrite' });
  } catch {
    dataFilePerm = 'prompt';
  }
  if (dataFilePerm !== 'granted') return { granted: false, fileState: null };
  return { granted: true, fileState: await readDataFile() };
}

export async function disconnectDataFile(): Promise<void> {
  dataFile = null;
  dataFilePerm = 'prompt';
  await idbDelete(IDB_KEY);
}
