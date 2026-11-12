import { createLivekitToken } from './security.js';

export const ROOM = 'rall-turbo-laser-live';
export const HOST_ID = 'rall-host';
export function configured() {
  const url = process.env.LIVEKIT_URL || '';
  return Boolean(/^wss:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/?$/.test(url) && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}
export function webSocketUrl() { return (process.env.LIVEKIT_URL || '').replace(/\/$/, ''); }
function httpBase() { return webSocketUrl().replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'); }

export async function twirp(method, body, grant) {
  if (!configured()) throw new Error('LIVEKIT_NOT_CONFIGURED');
  const token = createLivekitToken('rall-service', 'RALL Backend', grant, 60);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${httpBase()}/twirp/livekit.RoomService/${method}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal, cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404 || ['not_found','room_not_found'].includes(data.code)) return null;
      throw new Error('LIVEKIT_API_ERROR');
    }
    return data;
  } finally { clearTimeout(timer); }
}

export async function getStatus() {
  if (!configured()) return { configured: false, live: false, viewers: 0, title: '', provider: 'LiveKit' };
  const result = await twirp('ListParticipants', { room: ROOM }, { roomAdmin: true, room: ROOM });
  const people = result?.participants || [];
  const host = people.find(p => p.identity === HOST_ID);
  // La señal está activa solo si el presentador publicó al menos una pista.
  // La API Twirp puede serializar los enum de tipo en números o cadenas.
  const live = Boolean(host && (host.tracks?.length || 0) > 0);
  const viewers = people.filter(p => p.identity !== HOST_ID).length;
  let title = '';
  if (live) {
    try {
      const rooms = await twirp('ListRooms', { names: [ROOM] }, { roomList: true });
      const metadata = rooms?.rooms?.[0]?.metadata;
      if (metadata) title = String(JSON.parse(metadata)?.title || '').slice(0, 90);
    } catch { /* El título opcional nunca interrumpe la señal. */ }
  }
  return { configured: true, live, viewers, title: title || (live ? 'La máquina está sonando en directo' : ''), provider: 'LiveKit' };
}

export function broadcastToken() {
  return createLivekitToken(HOST_ID, 'Ronald · RALL Turbo Laser', {
    room: ROOM, roomJoin: true, canPublish: true, canPublishData: false, canSubscribe: true,
    canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio']
  }, 60 * 60 * 12);
}

export function viewerToken() {
  return createLivekitToken(`viewer-${cryptoRandom()}`, 'Espectador RALL', {
    room: ROOM, roomJoin: true, canPublish: false, canPublishData: false, canSubscribe: true
  }, 60 * 20);
}
function cryptoRandom() { return globalThis.crypto.randomUUID(); }

export async function changeTitle(title) {
  return twirp('UpdateRoomMetadata', { room: ROOM, metadata: JSON.stringify({ title }) }, { roomAdmin: true, room: ROOM });
}
