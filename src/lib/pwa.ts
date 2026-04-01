export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      // In dev, unregister SW to avoid stale cached app appearing without a running server.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => undefined)
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
