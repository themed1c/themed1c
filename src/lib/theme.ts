export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  // Desktop app: keep the native window controls on theme colors too.
  void window.lifeOS?.setTitlebar?.(
    dark
      ? { color: '#2B2B2F', symbolColor: '#BCBCC3' }
      : { color: '#FDFCF9', symbolColor: '#7E7663' },
  );
  try {
    localStorage.setItem('life-org-theme', dark ? 'dark' : 'light');
  } catch {
    /* storage unavailable */
  }
}

export function initialDark(): boolean {
  try {
    return localStorage.getItem('life-org-theme') === 'dark';
  } catch {
    return false;
  }
}

export const FONT_LABEL = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const FONT_WORDMARK = "'Outfit', 'Helvetica Neue', sans-serif";
export const FONT_NUM = "'Oswald', 'Arial Narrow', sans-serif";
export const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif";
