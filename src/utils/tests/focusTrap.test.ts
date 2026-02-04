import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { createFocusTrap } from '@/utils/focusTrap';

function keydown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  document.dispatchEvent(ev);
  return ev;
}

describe('createFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('focuses the first focusable element by default', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Second</button>
    `;
    document.body.appendChild(container);

    createFocusTrap(container);

    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  it('supports initialFocus as a selector', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button id="a">A</button>
      <button id="b">B</button>
    `;
    document.body.appendChild(container);

    createFocusTrap(container, { initialFocus: '#b' });

    expect(document.activeElement).toBe(container.querySelector('#b'));
  });

  it('supports initialFocus as an HTMLElement', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button');
    btn1.textContent = 'A';
    const btn2 = document.createElement('button');
    btn2.textContent = 'B';

    container.append(btn1, btn2);
    document.body.appendChild(container);

    createFocusTrap(container, { initialFocus: btn2 });

    expect(document.activeElement).toBe(btn2);
  });

  it('adds tabindex="-1" to container if missing', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button>Hi</button>`;
    document.body.appendChild(container);

    createFocusTrap(container);

    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('wraps focus on Tab from last -> first', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Last</button>
    `;
    document.body.appendChild(container);

    createFocusTrap(container);

    const [first, last] = Array.from(container.querySelectorAll('button'));
    last.focus();
    expect(document.activeElement).toBe(last);

    const ev = keydown('Tab');
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('wraps focus on Shift+Tab from first -> last', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Last</button>
    `;
    document.body.appendChild(container);

    createFocusTrap(container);

    const [first, last] = Array.from(container.querySelectorAll('button'));
    first.focus();
    expect(document.activeElement).toBe(first);

    const ev = keydown('Tab', { shiftKey: true });
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('if activeElement is outside container, Tab moves focus to first', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    const container = document.createElement('div');
    container.innerHTML = `
    <button>First</button>
    <button>Second</button>
  `;
    document.body.appendChild(container);

    createFocusTrap(container);

    const first = container.querySelector('button')!;

    const activeSpy = vi
      .spyOn(document, 'activeElement', 'get')
      .mockReturnValue(outside as unknown as Element);

    const ev = keydown('Tab');

    activeSpy.mockRestore();

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('focusin outside container is pulled back to first focusable (or fallback)', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Second</button>
    `;
    document.body.appendChild(container);

    createFocusTrap(container);

    outside.focus();
    fireEvent.focusIn(outside);

    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  it('when no focusable children exist, Tab prevents default and focuses fallbackFocus', () => {
    const container = document.createElement('div');
    container.innerHTML = `<div>no focusables</div>`;
    document.body.appendChild(container);

    const fallback = document.createElement('button');
    fallback.textContent = 'Fallback';
    document.body.appendChild(fallback);

    createFocusTrap(container, { fallbackFocus: fallback });

    const ev = keydown('Tab');
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(fallback);
  });

  it('Escape triggers onEscape when closeOnEscape is true', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button>Hi</button>`;
    document.body.appendChild(container);

    const onEscape = vi.fn();
    createFocusTrap(container, { onEscape, closeOnEscape: true });

    keydown('Escape');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('Escape does not trigger onEscape when closeOnEscape is false', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button>Hi</button>`;
    document.body.appendChild(container);

    const onEscape = vi.fn();
    createFocusTrap(container, { onEscape, closeOnEscape: false });

    keydown('Escape');

    expect(onEscape).toHaveBeenCalledTimes(0);
  });

  it('cleanup restores focus to the previously focused element when restoreFocus is true', () => {
    const before = document.createElement('button');
    before.textContent = 'Before';
    document.body.appendChild(before);
    before.focus();
    expect(document.activeElement).toBe(before);

    const container = document.createElement('div');
    container.innerHTML = `<button>Inside</button>`;
    document.body.appendChild(container);

    const cleanup = createFocusTrap(container, { restoreFocus: true });
    expect(document.activeElement).toBe(container.querySelector('button'));

    cleanup();
    expect(document.activeElement).toBe(before);
  });

  it('cleanup does not restore focus when restoreFocus is false', () => {
    const before = document.createElement('button');
    before.textContent = 'Before';
    document.body.appendChild(before);
    before.focus();

    const container = document.createElement('div');
    container.innerHTML = `<button>Inside</button>`;
    document.body.appendChild(container);

    const cleanup = createFocusTrap(container, { restoreFocus: false });

    cleanup();
    expect(document.activeElement).not.toBe(before);
  });

  it('after cleanup, it no longer traps focus', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    const container = document.createElement('div');
    container.innerHTML = `<button>Inside</button>`;
    document.body.appendChild(container);

    const cleanup = createFocusTrap(container);

    cleanup();

    outside.focus();
    fireEvent.focusIn(outside);

    expect(document.activeElement).toBe(outside);
  });
});
