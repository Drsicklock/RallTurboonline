import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFileSync, existsSync } from 'node:fs';

const rl = createInterface({ input: stdin, output: stdout });
const path = '.env.local';
if (existsSync(path)) {
  console.log('Ya existe .env.local. No se sobrescribió para proteger tus variables.');
  process.exit(0);
}
console.log('\nCONFIGURACIÓN SEGURA · RALL TURBO LASER\n');
console.log('La clave no se añadirá a ninguna página. El servidor utiliza su hash scrypt.');
const username = (await rl.question('Usuario administrador [RonaldRall]: ')).trim() || 'RonaldRall';
const password = await rl.question('Contraseña elegida para Ronald (no se guardará en texto): ');
if (password.length < 12) { console.error('Utiliza una contraseña de al menos 12 caracteres.'); rl.close(); process.exit(1); }
const salt = randomBytes(20);
const digest = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const hash = `scrypt$32768$${salt.toString('base64url')}$${digest.toString('base64url')}`;
const secret = randomBytes(48).toString('base64url');
writeFileSync(path, [
  '# ARCHIVO PRIVADO. NUNCA SUBIR A GITHUB.',
  `ADMIN_USERNAME=${JSON.stringify(username)}`,
  `ADMIN_PASSWORD_HASH=${JSON.stringify(hash)}`,
  `SESSION_SECRET=${JSON.stringify(secret)}`,
  'LIVEKIT_URL="wss://TU-PROYECTO.livekit.cloud"',
  'LIVEKIT_API_KEY=""',
  'LIVEKIT_API_SECRET=""',
  ''
].join('\n'), { mode: 0o600, flag: 'wx' });
rl.close();
console.log('\n.env.local generado. Agrega las 3 variables de LiveKit y copia todas a Vercel > Settings > Environment Variables.');
console.log('No publiques ni compartas .env.local.');
