// main.jsx (or App.jsx)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import reportWebVitals from "./lib/reportWebVitals";
// Side-effect import: initialises i18next with en/gu resources and
// restores the stored language preference. Must run before any
// component calls useTranslation().
import "./i18n/i18n";

// A deploy replaces the hashed chunk files, so a tab opened before it fails
// to load the next lazy page. Reload once to pick up the new build (test
// progress is autosaved, so a student resumes where they were). The guard
// stops a reload loop if the chunk is genuinely broken.
const CHUNK_RELOAD_KEY = "jumpstart.chunkReloadAt";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once; the browser keeps the tab usable.
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Registered after render so observer setup never sits between the user
// and first paint. web-vitals reads buffered PerformanceEntry records, so
// registering late still captures metrics that settled earlier.
reportWebVitals();
