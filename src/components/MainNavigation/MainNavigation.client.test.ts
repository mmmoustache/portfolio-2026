import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('MainNavigation.client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls initMainNav immediately when document is already loaded', async () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');

    const initSpy = vi.fn();
    vi.doMock('@/components/MainNavigation/MainNavigation', () => ({
      initMainNav: initSpy,
    }));

    await import('@/components/MainNavigation/MainNavigation.client');

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(document);
  });

  it('waits for DOMContentLoaded when document is loading', async () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

    const initSpy = vi.fn();
    vi.doMock('@/components/MainNavigation/MainNavigation', () => ({
      initMainNav: initSpy,
    }));

    const addSpy = vi.spyOn(document, 'addEventListener');

    await import('@/components/MainNavigation/MainNavigation.client');

    // Should not run yet
    expect(initSpy).toHaveBeenCalledTimes(0);

    const domLoadedCall = addSpy.mock.calls.find((c) => c[0] === 'DOMContentLoaded');
    expect(domLoadedCall).toBeTruthy();

    const handler = domLoadedCall?.[1] as EventListener;
    const options = domLoadedCall?.[2] as AddEventListenerOptions | undefined;
    expect(options && typeof options === 'object' ? options.once : false).toBe(true);

    handler(new Event('DOMContentLoaded'));
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(document);
  });
});
