/**
 * Service-worker registration with strict guards:
 *  - PROD builds only (import.meta.env.PROD)
 *  - Never inside an iframe (Lovable preview is iframed)
 *  - Never on Lovable preview hosts
 *  - Always unregister stale SWs in dev/preview to prevent cache pollution
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") && host.startsWith("id-preview--");

  // In dev or preview/iframe contexts, scrub any leftover SWs and bail.
  if (!import.meta.env.PROD || inIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* swallow — SW failure must never break the app */
    });
  });
}
