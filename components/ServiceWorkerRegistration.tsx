"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is optional; a registration failure must never block the site.
    });
  }, []);

  return null;
}
