export function isHTMLElement(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement;
}

export function isHTMLButtonElement(el: Element | null): el is HTMLButtonElement {
  return el instanceof HTMLButtonElement;
}

export function queryRequired<T extends Element>(
  root: ParentNode,
  selector: string,
  isExpected: (el: Element | null) => el is T,
  expectedLabel: string
): T {
  const el = root.querySelector(selector);
  if (!isExpected(el)) {
    throw new Error(`Missing or invalid ${expectedLabel}: ${selector}`);
  }

  return el;
}

export function queryOptional<T extends Element>(
  root: ParentNode,
  selector: string,
  isExpected: (el: Element | null) => el is T
): T | null {
  const el = root.querySelector(selector);
  if (el == null) return null;

  return isExpected(el) ? el : null;
}

export function findHashTarget(hash: string): HTMLElement | null {
  const id = hash.slice(1);
  if (!id) return null;

  try {
    const decodedId = decodeURIComponent(id);
    const target = document.getElementById(decodedId);
    return target instanceof HTMLElement ? target : null;
  } catch {
    return null;
  }
}
