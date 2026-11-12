import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { verifyPassword, isAdmin, createLivekitToken } from '../api/_lib/security.js';
import authHandler from '../api/auth.js';
import liveHandler from '../api/live.js';

const CORRECT_PASSWORD = 'test-password-secure-12345';
const salt = randomBytes(16);
const digest = scryptSync(CORRECT_PASSWORD, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64*1024*1024 });
process.env.ADMIN_USERNAME = 'RonaldRall';
process.env.ADMIN_PASSWORD_HASH = `scrypt$32768$${salt.toString('base64url')}$${digest.toString('base64url')}`;
process.env.SESSION_SECRET = randomBytes(48).toString('base64url');
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-at-least-long-enough';

function req(method='GET', body={}, cookie='', origin='https://rall.example') {
  return { method, body, headers: {origin,host:'rall.example', cookie}, socket:{remoteAddress:'127.0.0.1'} };
}
function res() {
  return {
    headers:{}, statusCode:200,
    setHeader(name,value) {this.headers[name.toLowerCase()] = value;},
    end(payload) { this.body=JSON.parse(payload); }
  };
}


test('hash scrypt acepta la contraseña correcta y rechaza otra', () => {
 assert.equal(verifyPassword(CORRECT_PASSWORD), true);
 assert.equal(verifyPassword('wrong-test-password'), false);
});

test('ingreso emite cookie HttpOnly, SameSite; verifica sesión', async () => {
 const response=res();
 await authHandler(req('POST',{action:'login',username:'RonaldRall',password:CORRECT_PASSWORD}),response);
 assert.equal(response.statusCode,200);
 const cookie=response.headers['set-cookie'];
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/SameSite=Strict/);
 assert.equal(isAdmin(req('GET',{},cookie.split(';')[0])),true);
 assert.equal(isAdmin(req('GET',{},cookie.split(';')[0].replace(/.$/,'x'))),false);
});

test('acceso rechazado por usuario erróneo', async()=> {
 const response=res();
 await authHandler(req('POST',{action:'login',username:'Invitado',password:CORRECT_PASSWORD}),response);
 assert.equal(response.statusCode,401);
});

test('protección de origen para operaciones que cambian estado', async()=> {
 const response=res();
 await authHandler(req('POST',{action:'logout'},'','https://sitio-falso.test'),response);
 assert.equal(response.statusCode,403);
});

test('endpoint LiveKit no entrega permisos de emisión a un visitante', async()=> {
 const response=res();
 await liveHandler(req('POST',{action:'host-token'}),response);
 assert.equal(response.statusCode,401);
});

test('token de espectador nunca puede publicar', () => {
 const jwt=createLivekitToken('viewer-sample','Espectador',{room:'rall-turbo-laser-live',roomJoin:true,canPublish:false},3600);
 const claims=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url'));
 assert.equal(claims.video.canPublish,false);
 assert.equal(claims.iss,'test-key');
});


test('consulta de LiveKit reconoce emisor y audiencia; solo emisor puede publicar', async () => {
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async (url, options) => {
   const method = String(url).split('/').at(-1);
   if (method === 'ListParticipants') return { ok:true, json:async()=>({participants:[
     {identity:'rall-host', tracks:[{type:'AUDIO'},{type:'VIDEO'}]},
     {identity:'viewer-1', tracks:[]},
     {identity:'viewer-2', tracks:[]}
   ]})};
   if (method === 'ListRooms') return {ok:true,json:async()=>({rooms:[{metadata:JSON.stringify({title:'RALL en vivo'})}]})};
   return { ok:false,status:404,json:async()=>({code:'not_found'}) };
 };
 try {
   const response = res();
   await liveHandler(req('GET'),response);
   assert.equal(response.statusCode,200);
   assert.equal(response.body.live,true);
   assert.equal(response.body.viewers,2);
   assert.equal(response.body.title,'RALL en vivo');
   const viewer=res();
   await liveHandler(req('POST',{action:'viewer-token'}),viewer);
   assert.equal(viewer.statusCode,200);
   const claims=JSON.parse(Buffer.from(viewer.body.token.split('.')[1],'base64url'));
   assert.equal(claims.video.canPublish,false);
   assert.equal(claims.video.canSubscribe,true);
 } finally { globalThis.fetch=originalFetch; }
});

test('solo la sesión de Ronald recibe token publicador', async () => {
  const auth = res();
  await authHandler(req('POST',{action:'login',username:'RonaldRall',password:CORRECT_PASSWORD}), auth);
  const cookie = auth.headers['set-cookie'].split(';')[0];
  const response = res();
  await liveHandler(req('POST',{action:'host-token'}, cookie),response);
  assert.equal(response.statusCode, 200);
  const jwt = JSON.parse(Buffer.from(response.body.token.split('.')[1], 'base64url'));
  assert.equal(jwt.sub,'rall-host');
  assert.equal(jwt.video.canPublish,true);
});
