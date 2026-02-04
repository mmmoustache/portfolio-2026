import { initMainNav } from '@/components/MainNavigation/MainNavigation';

function autoInit() {
  initMainNav(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit, { once: true });
} else {
  autoInit();
}
