(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let room = null;
  let kit = null;
  let busy = false;
  let activeCameraTrack = null;
  let sharing = false;
  // Señal musical: evita que el navegador trate la mezcla como ruido de fondo.
  const musicCapture = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } };
  function musicPublish() { return { audioPreset: kit?.AudioPresets?.musicHighQualityStereo, dtx: false, forceStereo: true }; }

  function message(text, isError = false, target = 'studio-message') {
    const el = $(target);
    el.textContent = text;
    el.classList.toggle('is-error', isError);
  }
  async function api(path, method = 'GET', data = null) {
    const res = await fetch(path, {
      method, cache: 'no-store', credentials: 'same-origin',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined
    });
    let parsed = {};
    try { parsed = await res.json(); } catch { /* service missing */ }
    if (!res.ok) throw new Error(parsed.error || (res.status === 404 ? 'Servidor sin API. Abre el proyecto desde Vercel.' : 'No se pudo contactar al servidor.'));
    return parsed;
  }
  function showAdmin(yes) {
    $('login-area').hidden = yes;
    $('studio-area').hidden = !yes;
    if (yes) refreshStatus();
  }

  async function refreshSession() {
    try {
      const result = await api('/api/auth');
      showAdmin(Boolean(result.authenticated));
      if (!result.authenticated && !result.configured) message('Antes de ingresar, configura las variables ADMIN_PASSWORD_HASH y SESSION_SECRET en Vercel.', true, 'auth-message');
    } catch (e) { message(e.message, true, 'auth-message'); }
  }

  async function refreshStatus() {
    if ($('studio-area').hidden) return;
    try {
      const result = await api('/api/live');
      const live = Boolean(result.live);
      $('admin-status').innerHTML = live ? '<i class="online-dot"></i> EN TRANSMISIÓN' : '<i class="offline-dot"></i> FUERA DEL AIRE';
      $('admin-status').classList.toggle('online', live);
      $('admin-viewers').textContent = String(result.viewers || 0).padStart(2,'0');
      if (!result.configured) message('Conecta LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET para transmitir desde la cabina.', true);
    } catch (e) { if (!room) message(e.message, true); }
  }

  function setControls(live) {
    const ids = ['stop-button','camera-toggle','microphone-toggle','screen-share','save-title','audio-device','video-device'];
    for (const id of ids) $(id).disabled = !live;
    $('start-button').disabled = live || busy;
    $('start-button').textContent = live ? '● ESTÁS TRANSMITIENDO' : '▶ INICIAR TRANSMISIÓN ↗';
    $('preview-live-tag').hidden = !live;
    $('connection-message').textContent = live ? 'Señal conectada y emitiendo' : 'Desconectado del servidor';
    $('preview-caption').textContent = live ? '¡SUENA LA MÁQUINA!' : 'LA CABINA ESTÁ LISTA';
    $('preview-mask').hidden = live && Boolean(activeCameraTrack);
  }

  function previewTrack() {
    const publications = [...(room?.localParticipant?.videoTrackPublications?.values() || [])];
    const camera = publications.find(p => p.source === 'camera' && p.track)?.track;
    const share = publications.find(p => p.source === 'screen_share' && p.track)?.track;
    const current = share || camera || null;
    const video = $('admin-video');
    if (current === activeCameraTrack) return;
    if (activeCameraTrack) activeCameraTrack.detach(video);
    activeCameraTrack = current;
    video.hidden = !current;
    $('preview-mask').hidden = Boolean(current);
    if (current) current.attach(video);
    else video.srcObject = null;
  }

  async function refreshDevices() {
    if (!kit || !room) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mapping = [['audio-device','audioinput'],['video-device','videoinput']];
      for (const [id, kind] of mapping) {
        const select = $(id);
        select.replaceChildren();
        for (const [i, device] of devices.filter(d => d.kind === kind).entries()) {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `${kind === 'audioinput' ? 'Micrófono' : 'Cámara'} ${i + 1}`;
          select.append(option);
        }
      }
    } catch { /* not all browsers expose labels */ }
  }

  async function start() {
    if (busy || room) return;
    busy = true;
    $('start-button').disabled = true;
    message('Conectando la cabina y solicitando acceso a los dispositivos...');
    try {
      const { token, url } = await api('/api/live','POST',{ action: 'host-token' });
      kit = await window.loadRallLiveKit();
      const next = new kit.Room({ adaptiveStream: true, dynacast: true });
      room = next;
      next.on(kit.RoomEvent.LocalTrackPublished, previewTrack);
      next.on(kit.RoomEvent.LocalTrackUnpublished, previewTrack);
      next.on(kit.RoomEvent.Disconnected, () => {
        if (room === next) { room = null; setControls(false); message('La señal se desconectó.', true); refreshStatus(); }
      });
      await next.connect(url, token);
      // Puede emitir con cámara + consola o solo audio si no dispone de cámara.
      let published = false;
      let lastDeviceError = null;
      try { await next.localParticipant.setCameraEnabled(true); published = true; }
      catch (e) { lastDeviceError = e; }
      try { await next.localParticipant.setMicrophoneEnabled(true, musicCapture, musicPublish()); published = true; }
      catch (e) { lastDeviceError = e; }
      if (!published) throw lastDeviceError || new Error('No hay cámara ni micrófono disponible');
      setControls(true);
      $('camera-toggle').textContent = next.localParticipant.isCameraEnabled ? 'DESACTIVAR' : 'ACTIVAR';
      $('microphone-toggle').textContent = next.localParticipant.isMicrophoneEnabled ? 'SILENCIAR' : 'ACTIVAR';
      previewTrack();
      await refreshDevices();
      try { await saveTitle(true); } catch { /* la señal funciona aunque no se guarde el título */ }
      message('¡Estás en vivo! Abre la página pública en otra pestaña para comprobar la señal.');
      refreshStatus();
    } catch (e) {
      message(`${e.message || 'No se pudo iniciar la transmisión'}. Revisa permisos, LiveKit y tu conexión.`, true);
      const old = room; room = null;
      if (old) await old.disconnect().catch(() => {});
      setControls(false);
    } finally { busy = false; if (!room) $('start-button').disabled = false; }
  }

  async function stop() {
    if (busy || !room) return;
    busy = true;
    $('stop-button').disabled = true;
    const old = room; room = null;
    try { await old.disconnect(); } catch {}
    if (activeCameraTrack) activeCameraTrack.detach($('admin-video'));
    activeCameraTrack = null;
    $('admin-video').srcObject = null;
    $('admin-video').hidden = true;
    sharing = false;
    setControls(false);
    message('Transmisión finalizada. La señal pública volverá al modo de espera.');
    busy = false; refreshStatus();
  }

  async function saveTitle(silent = false) {
    if (!room) return;
    const title = $('live-title-input').value.trim();
    if (title.length < 5) { if (!silent) message('Escribe un título de al menos 5 caracteres.', true); return; }
    const result = await api('/api/live','POST',{ action:'title', title });
    if (!silent) message(`Título actualizado: ${result.title}`);
  }

  async function toggleCamera() {
    if (!room) return;
    const nextState = !room.localParticipant.isCameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(nextState);
      $('camera-toggle').textContent = nextState ? 'DESACTIVAR' : 'ACTIVAR';
      $('camera-caption').textContent = nextState ? 'Cámara encendida' : 'Cámara apagada';
      previewTrack();
    } catch (e) { message(e.message, true); }
  }

  async function toggleMicrophone() {
    if (!room) return;
    const nextState = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(nextState, musicCapture, musicPublish());
      $('microphone-toggle').textContent = nextState ? 'SILENCIAR' : 'ACTIVAR';
      $('microphone-caption').textContent = nextState ? 'Entrada transmitiendo' : 'Silenciado';
    } catch (e) { message(e.message, true); }
  }

  async function toggleShare() {
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!sharing, { audio: true });
      sharing = !sharing;
      $('screen-share').textContent = sharing ? '▣ DEJAR DE COMPARTIR' : '▣ COMPARTIR PANTALLA';
      previewTrack();
    } catch (e) { message(e.message || 'No se pudo compartir pantalla', true); }
  }

  async function switchDevice(kind, value) {
    if (!value || !room) return;
    try { await room.switchActiveDevice(kind, value); message('Fuente actualizada correctamente.'); }
    catch (e) { message(e.message, true); }
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('login-submit').disabled = true;
    message('Validando acceso...', false, 'auth-message');
    try {
      await api('/api/auth','POST',{ action:'login', username:$('login-user').value.trim(), password:$('login-pass').value });
      $('login-pass').value = '';
      showAdmin(true);
    } catch (error) { message(error.message, true, 'auth-message'); }
    finally { $('login-submit').disabled = false; }
  });
  $('logout-btn').addEventListener('click', async () => {
    if (room) await stop();
    try { await api('/api/auth', 'POST', { action:'logout' }); } catch {}
    showAdmin(false);
    message('Sesión cerrada.', false, 'auth-message');
  });
  $('start-button').addEventListener('click', start);
  $('stop-button').addEventListener('click', stop);
  $('save-title').addEventListener('click', () => saveTitle().catch(e => message(e.message,true)));
  $('camera-toggle').addEventListener('click', toggleCamera);
  $('microphone-toggle').addEventListener('click', toggleMicrophone);
  $('screen-share').addEventListener('click', toggleShare);
  $('audio-device').addEventListener('change', e => switchDevice('audioinput', e.target.value));
  $('video-device').addEventListener('change', e => switchDevice('videoinput', e.target.value));
  setInterval(refreshStatus, 12000);
  refreshSession();
})();
