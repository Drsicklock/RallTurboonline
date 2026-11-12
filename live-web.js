(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  let status = { configured: false, live: false, viewers: 0, title: '' };
  let visible = true;
  let connecting = false;
  let room = null;
  let currentVideo = null;
  let currentAudio = null;

  function inform(message) {
    byId('rall-watch-message').textContent = message;
  }

  function renderState() {
    const join = byId('rall-join');
    if (!join) return;
    const watching = Boolean(room && room.state === 'connected');
    join.disabled = !status.live || !status.configured || connecting;
    join.innerHTML = connecting ? '<span>◌</span> CONECTANDO...' : '<span>▶</span> ENTRAR A LA SEÑAL';
    const label = byId('rall-waiting-label');
    label.textContent = status.live ? '¡EL RALL ESTÁ SONANDO EN VIVO!' : 'LA PRÓXIMA DESCARGA SE ESTÁ PREPARANDO';
    if (!watching && !connecting) {
      inform(status.live ? 'La señal está lista. Entra y escucha el verdadero sonido del RALL.' :
        status.configured ? 'Ronald puede activar la transmisión desde la cabina.' :
        'Próximamente: estamos conectando la cabina de transmisión.');
    }
    byId('rall-viewers-badge').textContent = `◉ ${Math.max(0, Number(status.viewers) || 0)} CONECTADOS`;
    const toolbar = byId('live-status-text');
    if (toolbar) toolbar.textContent = status.live ? 'EN VIVO AHORA' : 'PRÓXIMA TRANSMISIÓN';
    byId('live-signal')?.classList.toggle('is-live', Boolean(status.live));
    if (visible && status.title && status.live) byId('stream-title').textContent = status.title;
  }

  async function refreshStatus() {
    try {
      const response = await fetch('/api/live', { cache: 'no-store' });
      if (!response.ok) throw new Error('No fue posible obtener el estado');
      const state = await response.json();
      status = { configured: Boolean(state.configured), live: Boolean(state.live), viewers: state.viewers || 0, title: state.title || '' };
      if (!status.live && room && !connecting) await leave();
    } catch {
      // Evita desconectar a alguien que ya está viendo por un fallo momentáneo de consulta.
      if (!room) status = { configured: false, live: false, viewers: 0, title: '' };
    }
    renderState();
  }

  function videoTrackFromParticipant(participant) {
    if (!participant) return null;
    const publications = [...participant.videoTrackPublications.values()];
    return publications.find(pub => pub.track && pub.source === 'screen_share')?.track ||
      publications.find(pub => pub.track && pub.source === 'camera')?.track ||
      publications.find(pub => pub.track)?.track || null;
  }

  function audioTrackFromParticipant(participant) {
    if (!participant) return null;
    return [...participant.audioTrackPublications.values()].find(pub => pub.track)?.track || null;
  }

  function attachTracks() {
    if (!room) return;
    const host = room.remoteParticipants.get('rall-host');
    const video = videoTrackFromParticipant(host);
    const audio = audioTrackFromParticipant(host);
    const videoElement = byId('rall-view-video');
    const audioElement = byId('rall-view-audio');
    if (currentVideo !== video) {
      if (currentVideo) currentVideo.detach(videoElement);
      currentVideo = video;
      if (video) video.attach(videoElement);
      else videoElement.srcObject = null;
    }
    if (currentAudio !== audio) {
      if (currentAudio) currentAudio.detach(audioElement);
      currentAudio = audio;
      if (audio) audio.attach(audioElement);
      else audioElement.srcObject = null;
    }
    inform(host ? 'La señal está conectada. ¡Disfruta la descarga!' : 'Conectado. Esperando imagen de Ronald...');
  }

  async function join() {
    if (connecting || room) return;
    connecting = true; renderState();
    try {
      const response = await fetch('/api/live', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'viewer-token' })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'La señal aún no está disponible');
      const kit = await window.loadRallLiveKit();
      const next = new kit.Room({ adaptiveStream: true, dynacast: true });
      room = next;
      next.on(kit.RoomEvent.TrackSubscribed, attachTracks);
      next.on(kit.RoomEvent.TrackUnsubscribed, attachTracks);
      next.on(kit.RoomEvent.ParticipantConnected, attachTracks);
      next.on(kit.RoomEvent.ParticipantDisconnected, attachTracks);
      next.on(kit.RoomEvent.Disconnected, () => { if (room === next) { room = null; setWatching(false); } });
      await next.connect(payload.url, payload.token);
      byId('rall-view-video').muted = true; // La pista de audio separada evita reproducir doble sonido.
      setWatching(true);
      attachTracks();
      try { await next.startAudio(); } catch { /* Botón de desbloquear audio visible. */ }
    } catch (err) {
      inform(err.message || 'No se pudo conectar. Intenta nuevamente.');
      if (room) { try { await room.disconnect(); } catch {} }
      room = null;
      setWatching(false);
    } finally { connecting = false; renderState(); }
  }

  function setWatching(active) {
    byId('rall-waiting').hidden = active;
    byId('rall-live-player').hidden = !active;
    if (!active) {
      const video = byId('rall-view-video');
      const audio = byId('rall-view-audio');
      if (currentVideo) currentVideo.detach(video);
      if (currentAudio) currentAudio.detach(audio);
      currentVideo = currentAudio = null;
      video.srcObject = null;
      audio.srcObject = null;
    }
  }

  async function leave() {
    const old = room;
    room = null;
    if (old) { try { await old.disconnect(); } catch {} }
    setWatching(false); renderState();
  }

  window.RALL_LIVE = {
    onPlatformChange(open) {
      visible = open;
      if (!open && room) leave();
      if (open) { renderState(); }
    },
    init() {
      byId('rall-join')?.addEventListener('click', join);
      byId('rall-leave')?.addEventListener('click', leave);
      byId('rall-unmute')?.addEventListener('click', async () => {
        try {
          await room?.startAudio();
          await byId('rall-view-audio').play();
          byId('rall-unmute').textContent = 'AUDIO ACTIVADO ✓';
        } catch { byId('rall-unmute').textContent = 'TOCA PARA ACTIVAR AUDIO'; }
      });
      refreshStatus();
      setInterval(() => { if (document.visibilityState === 'visible') refreshStatus(); }, 14000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshStatus(); });
    }
  };
})();
