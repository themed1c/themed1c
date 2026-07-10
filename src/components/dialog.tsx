import React from 'react';

/* In-theme replacements for window.confirm and window.prompt. The native ones
 * ignore the app's palette and look like a different program.
 *
 * A module-level publisher lets non-component code (the store) open a dialog
 * too, without threading a context through every caller. */

interface BaseOpts {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

interface PromptOpts extends BaseOpts {
  placeholder?: string;
  /** Confirm stays disabled until the typed text matches, case-insensitively. */
  requireText?: string;
}

type Req =
  | (BaseOpts & { kind: 'confirm'; resolve(v: boolean): void })
  | (PromptOpts & { kind: 'prompt'; resolve(v: string | null): void });

let publish: ((r: Req) => void) | null = null;

/** Resolves true when confirmed. Falls back to false if no host is mounted. */
export function confirmDialog(opts: BaseOpts): Promise<boolean> {
  if (!publish) return Promise.resolve(false);
  return new Promise((resolve) => publish?.({ ...opts, kind: 'confirm', resolve }));
}

/** Resolves the typed text, or null when cancelled. */
export function promptDialog(opts: PromptOpts): Promise<string | null> {
  if (!publish) return Promise.resolve(null);
  return new Promise((resolve) => publish?.({ ...opts, kind: 'prompt', resolve }));
}

export function DialogHost() {
  const [req, setReq] = React.useState<Req | null>(null);
  const [text, setText] = React.useState('');
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    publish = (r) => {
      setText('');
      setReq(r);
    };
    return () => {
      publish = null;
    };
  }, []);

  // A destructive dialog focuses Cancel, never the button that destroys: a
  // stray Enter or Space must not delete anything. Prompts focus their input.
  React.useEffect(() => {
    if (req?.kind !== 'confirm') return;
    if (req.danger) cancelRef.current?.focus();
    else confirmRef.current?.focus();
  }, [req]);

  if (!req) return null;

  const finish = (value: boolean | string | null) => {
    setReq(null);
    setText('');
    if (req.kind === 'confirm') req.resolve(value as boolean);
    else req.resolve(value as string | null);
  };

  const cancel = () => finish(req.kind === 'confirm' ? false : null);
  const accept = () => finish(req.kind === 'confirm' ? true : text);

  const gate = req.kind === 'prompt' ? req.requireText : undefined;
  const satisfied = !gate || text.trim().toUpperCase() === gate.toUpperCase();
  // Enter never fires a destructive confirm. In a prompt, typing the required
  // word is itself the deliberate act, so Enter is allowed once it matches.
  const enterAccepts = req.kind === 'prompt' ? satisfied : !req.danger;

  return (
    <div
      className="dialog-backdrop fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={req.title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel(); // click outside cancels
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          cancel();
        }
        if (e.key === 'Enter' && enterAccepts && !e.nativeEvent.isComposing) {
          e.preventDefault();
          accept();
        }
      }}
    >
      <div className="dialog-panel">
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {req.title}
        </div>

        {req.body && (
          <div
            style={{
              fontSize: 13.5,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginTop: 9,
            }}
          >
            {req.body}
          </div>
        )}

        {req.kind === 'prompt' && (
          <input
            className="field"
            autoFocus
            data-dialog-input
            value={text}
            placeholder={req.placeholder}
            onChange={(e) => setText(e.target.value)}
            style={{ width: '100%', marginTop: 16, padding: '10px 13px', fontSize: 13.5 }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            ref={cancelRef}
            className="ghost-btn"
            data-dialog-cancel
            onClick={cancel}
            style={{ padding: '8px 16px', fontSize: 12.5, borderRadius: 7 }}
          >
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            className={req.danger ? 'danger-btn' : 'accent-btn'}
            data-dialog-confirm
            disabled={!satisfied}
            onClick={accept}
            style={{ padding: '8px 18px', fontSize: 12.5, borderRadius: 7 }}
          >
            {req.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
