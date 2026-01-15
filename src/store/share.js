import { atom } from 'nanostores';

export const copied = atom(false);

export function flashCopied() {
  copied.set(true);
  globalThis.setTimeout(() => copied.set(false), 1200);
}
