import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatic background update check when the user opens or returns to the app
if (typeof window !== 'undefined') {
  let currentBuildVersion: string | null = null;

  const checkForLiveUpdate = async () => {
    try {
      const res = await fetch(`/api/app-version?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.version) return;

      if (!currentBuildVersion) {
        currentBuildVersion = String(data.version);
      } else if (currentBuildVersion !== String(data.version)) {
        currentBuildVersion = String(data.version);
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch {}
        }
        window.location.reload();
      }
    } catch {
      // Offline or unreachable, continue seamlessly
    }
  };

  // Check on initial launch
  checkForLiveUpdate();

  // Check whenever the user switches back to or reopens the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForLiveUpdate();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
