import type Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
    __shareBound?: boolean;
  }
}

export {};
