import { json, requirePostOrigin, parseBody, secureCompare, verifyPassword, adminConfigured,
  isAdmin, setSession, clearSession, registerFailedAttempt, isRateLimited, resetAttempts } from './_lib/security.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { authenticated: isAdmin(req), configured: adminConfigured() });
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!requirePostOrigin(req)) return json(res, 403, { error: 'Origen no autorizado' });
  let body;
  try { body = parseBody(req); } catch { return json(res, 400, { error: 'Solicitud inválida' }); }
  if (body.action === 'logout') { clearSession(req, res); return json(res, 200, { authenticated: false }); }
  if (body.action !== 'login') return json(res, 400, { error: 'Acción inválida' });
  if (!adminConfigured()) return json(res, 503, { error: 'Faltan configurar las variables de seguridad del servidor.' });
  if (isRateLimited(req)) return json(res, 429, { error: 'Demasiados intentos. Vuelve a intentarlo en 10 minutos.' });
  const username = String(body.username || '');
  const password = body.password;
  const expectedUser = process.env.ADMIN_USERNAME || 'RonaldRall';
  let passwordOk = false;
  try { passwordOk = verifyPassword(password); } catch { passwordOk = false; }
  if (!secureCompare(username, expectedUser) || !passwordOk) {
    registerFailedAttempt(req);
    return json(res, 401, { error: 'Usuario o contraseña incorrectos.' });
  }
  resetAttempts(req);
  setSession(req, res);
  return json(res, 200, { authenticated: true });
}
