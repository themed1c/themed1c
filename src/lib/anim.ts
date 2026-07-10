import { createTimeline, stagger } from 'animejs';

/* Central animation helpers (anime.js v4). One rule: subtle and premium.
 * Things glide and settle; nothing bounces, nothing shouts, and the palette
 * is never touched. Every decorative animation respects reduced-motion. */

export function reducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Section entrance: the module's blocks rise and fade in sequence. Runs on
 *  every module switch; inline styles are cleared afterwards so hover
 *  transitions keep working. */
export function enterSection(section: HTMLElement): void {
  const children = Array.from(section.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );
  if (!children.length || reducedMotion()) return;
  const show = () => {
    for (const c of children) {
      c.style.opacity = '';
      c.style.transform = '';
    }
  };
  // Hide before first paint so nothing flashes at full opacity.
  for (const c of children) c.style.opacity = '0';
  try {
    createTimeline({
      defaults: { ease: 'outQuint' },
      onComplete: show,
    }).add(children, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 500,
      delay: stagger(55),
    });
  } catch {
    show(); // a failed flourish must never leave the page blank
  }
}
