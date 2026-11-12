/* Solo carga la biblioteca al intentar entrar a una transmisión. */
(() => {
  let pending;
  window.loadRallLiveKit = () => {
    if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/livekit-client@2.23.0/dist/livekit-client.umd.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => window.LivekitClient ? resolve(window.LivekitClient) : reject(new Error('No se cargó el reproductor'));
      script.onerror = () => reject(new Error('No se pudo descargar la biblioteca de transmisión'));
      document.head.append(script);
    }).catch(e => { pending = null; throw e; });
    return pending;
  };
})();
