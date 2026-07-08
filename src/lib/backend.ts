import type { ChatTurn, PersistedState } from './types';
import { seedState } from './seed';

export interface AICompletePayload {
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
  /** Calls the Anthropic Messages API with the key from settings. */
  aiComplete(payload: AICompletePayload): Promise<string>;
}

interface LifeOSBridge {
  load(): Promise<PersistedState | null>;
  save(patch: Partial<PersistedState>): Promise<void>;
  aiComplete(payload: AICompletePayload): Promise<string>;
}

declare global {
  interface Window {
    lifeOS?: LifeOSBridge;
  }
}

class ElectronBackend implements Backend {
  kind = 'electron' as const;
  private bridge: LifeOSBridge;

  constructor(bridge: LifeOSBridge) {
    this.bridge = bridge;
  }

  async load(): Promise<PersistedState> {
    const loaded = await this.bridge.load();
    if (loaded) return { ...seedState(), ...loaded };
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

class BrowserBackend implements Backend {
  kind = 'browser' as const;

  async load(): Promise<PersistedState> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...seedState(), ...(JSON.parse(raw) as Partial<PersistedState>) };
    } catch {
      /* corrupted or unavailable storage: fall through to seed */
    }
    return seedState();
  }

  async save(patch: Partial<PersistedState>): Promise<void> {
    let current: Partial<PersistedState> = {};
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) current = JSON.parse(raw) as Partial<PersistedState>;
    } catch {
      /* start fresh */
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
  }

  async aiComplete(payload: AICompletePayload): Promise<string> {
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
}

export function createBackend(): Backend {
  if (window.lifeOS) return new ElectronBackend(window.lifeOS);
  return new BrowserBackend();
}
