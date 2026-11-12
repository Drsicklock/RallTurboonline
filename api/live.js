import { json, requirePostOrigin, parseBody, isAdmin } from './_lib/security.js';
import { configured, webSocketUrl, getStatus, broadcastToken, viewerToken, changeTitle } from './_lib/livekit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try { return json(res, 200, await getStatus()); }
    catch { return json(res, 503, { configured: configured(), live: false, viewers: 0, title: '', error: 'No se pudo consultar la señal de video.' }); }
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!requirePostOrigin(req)) return json(res, 403, { error: 'Origen no autorizado' });
  let body;
  try { body = parseBody(req); } catch { return json(res, 400, { error: 'Solicitud inválida' }); }
  if (!configured()) return json(res, 503, { error: 'Falta conectar LiveKit en las variables de Vercel.' });
  try {
    if (body.action === 'host-token') {
      if (!isAdmin(req)) return json(res, 401, { error: 'Acceso de administrador requerido.' });
      return json(res, 200, { token: broadcastToken(), url: webSocketUrl() });
    }
    if (body.action === 'viewer-token') {
      const state = await getStatus();
      if (!state.live) return json(res, 409, { error: 'El RALL todavía no está transmitiendo.' });
      return json(res, 200, { token: viewerToken(), url: webSocketUrl() });
    }
    if (body.action === 'title') {
      if (!isAdmin(req)) return json(res, 401, { error: 'Acceso de administrador requerido.' });
      const title = String(body.title || '').trim().slice(0, 90);
      if (title.length < 5) return json(res, 400, { error: 'El título debe tener al menos cinco caracteres.' });
      await changeTitle(title);
      return json(res, 200, { saved: true, title });
    }
    return json(res, 400, { error: 'Acción inválida' });
  } catch {
    return json(res, 503, { error: 'No se pudo contactar con el servidor de transmisión.' });
  }
}
