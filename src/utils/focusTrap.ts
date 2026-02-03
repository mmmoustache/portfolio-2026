export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type InitialFocus = string | HTMLElement | null;

export type FocusTrapOptions = {
  /**
   * Element or selector to focus when the trap activates.
   * Defaults to first focusable element inside the container.
   */
  initialFocus?: InitialFocus;

  /**
   * Where focus goes if no focusable children exist.
   * Defaults to the container itself.
   */
  fallbackFocus?: HTMLElement;

  /**
   * Restore focus to the previously focused element on cleanup.
   * Default: true
   */
  restoreFocus?: boolean;

  /**
   * Whether Escape triggers onEscape.
   * Default: true
   */
  closeOnEscape?: boolean;

  /**
   * Called when Escape is pressed (if enabled).
   */
  onEscape?: (() => void) | null;
};

function isFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const style = globalThis.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusable
  );
}

/**
 * Traps keyboard focus inside `container`.
 * Returns a cleanup function to remove listeners and restore focus.
 */
export function createFocusTrap(
  container: HTMLElement,
  {
    initialFocus = null,
    fallbackFocus = container,
    restoreFocus = true,
    closeOnEscape = true,
    onEscape = null,
  }: FocusTrapOptions = {}
): () => void {
  if (!container) {
    throw new Error('createFocusTrap: container is required');
  }

  const previouslyFocused = document.activeElement as HTMLElement | null;

  if (!container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '-1');
  }

  function resolveInitialFocus(): HTMLElement | null {
    if (typeof initialFocus === 'string') {
      return container.querySelector<HTMLElement>(initialFocus);
    }
    if (initialFocus instanceof HTMLElement) {
      return initialFocus;
    }
    return null;
  }

  function focusInitial() {
    const focusables = getFocusable(container);
    const target = resolveInitialFocus() || focusables[0] || fallbackFocus;

    target?.focus({ preventScroll: true });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape') {
      onEscape?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusables = getFocusable(container);

    if (focusables.length === 0) {
      e.preventDefault();
      fallbackFocus.focus({ preventScroll: true });
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!active || !container.contains(active)) {
      e.preventDefault();
      first.focus({ preventScroll: true });
      return;
    }

    if (e.shiftKey) {
      if (active === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function handleFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement | null;
    if (!target || !container.contains(target)) {
      const focusables = getFocusable(container);
      (focusables[0] || fallbackFocus).focus({ preventScroll: true });
    }
  }

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('focusin', handleFocusIn, true);

  focusInitial();

  return function cleanup() {
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('focusin', handleFocusIn, true);

    if (restoreFocus && previouslyFocused) {
      previouslyFocused.focus({ preventScroll: true });
    }
  };
}
