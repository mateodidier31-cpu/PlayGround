import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.dirname(new URL(import.meta.url).pathname);
const port = Number(process.env.PORT || 3000);
const profiles = new Map();
const profileFile = path.join(root, '.ashen-profiles.json');
const bossFile = path.join(root, '.ashen-boss.json');
try { for (const [id, p] of Object.entries(JSON.parse(fs.readFileSync(profileFile, 'utf8')))) profiles.set(id, p); } catch {}

const clients = new Map();
const MAX_PLAYERS = 15;
const boss = { hp: 50000, max: 50000, phase: 0, attack: null };
try {
  const saved = JSON.parse(fs.readFileSync(bossFile, 'utf8'));
  if (Number.isFinite(saved.hp)) boss.hp = Math.max(0, Math.min(boss.max, Number(saved.hp)));
  boss.phase = boss.hp <= 12500 ? 3 : boss.hp <= 25000 ? 2 : boss.hp <= 37500 ? 1 : 0;
} catch {}

let saveTimer;
function saveProfiles() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(profileFile, JSON.stringify(Object.fromEntries(profiles), null, 2), () => {}), 50);
}
function saveBoss() {
  fs.writeFile(bossFile, JSON.stringify({ hp: boss.hp, max: boss.max, phase: boss.phase }), () => {});
}
function safeProfile(id) {
  const p = profiles.get(id) || { rank: 0, wins: 0, bosses: 0, damage: 0, deaths: 0, matches: 0, bossDamage: 0 };
  profiles.set(id, p);
  return p;
}
function awardRank(profile) {
  const thresholds = [0, 1, 3, 6, 10, 16, 24];
  let rank = 0;
  for (let i = 1; i < thresholds.length; i++) if ((profile.wins || 0) >= thresholds[i]) rank = i;
  profile.rank = Math.max(profile.rank || 0, rank);
}
function frame(op, data = {}) { return Buffer.from(JSON.stringify({ op, ...data })); }
function send(socket, op, data) { if (socket.wsReadyState === 1) socket.send(frame(op, data)); }
function broadcast(op, data) {
  const wire = frame(op, data);
  for (const c of [...clients.values()]) if (c.ws.wsReadyState === 1) c.ws.send(wire);
}
function snapshot() {
  return {
    boss: { hp: boss.hp, max: boss.max, phase: boss.phase },
    players: [...clients.values()].map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, hp: c.hp, dir: c.dir, profile: safeProfile(c.profileId) }))
  };
}
function removeClient(id) {
  if (!clients.delete(id)) return;
  broadcast('leave', { id });
  saveProfiles();
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, players: clients.size, max: MAX_PLAYERS, bossHp: boss.hp })); }
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  file = path.normalize(file).replace(/^([/\\])+/, '');
  const full = path.join(root, file);
  if (!full.startsWith(root) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  const ext = path.extname(full);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const pendingSockets = new Set();
server.on('upgrade', (req, socket) => {
  if (req.url !== '/arena' || clients.size + pendingSockets.size >= MAX_PLAYERS) { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string') return socket.destroy();

  pendingSockets.add(socket);
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + MAGIC).digest('base64') + '\r\n\r\n');

  const id = crypto.randomUUID();
  socket.buffer = Buffer.alloc(0);
  socket.wsReadyState = 1;
  socket.wsClosed = false;
  socket.joined = false;
  socket.lastHit = 0;
  socket.lastState = 0;

  socket.send = (buf) => {
    if (socket.wsReadyState !== 1 || socket.wsClosed) return;
    const n = buf.length;
    if (n > 65536) return;
    if (n < 126) {
      socket.write(Buffer.concat([Buffer.from([0x81, n]), buf]));
    } else if (n < 65536) {
      const h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); socket.write(Buffer.concat([h, buf]));
    } else {
      const h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); socket.write(Buffer.concat([h, buf]));
    }
  };

  socket.receive = (data) => {
    if (socket.wsClosed) return;
    if (socket.buffer.length + data.length > 65536) { socket.destroy(); return; }
    socket.buffer = Buffer.concat([socket.buffer, data]);
    while (socket.buffer.length >= 2) {
      const b1 = socket.buffer[0], b2 = socket.buffer[1];
      const fin = !!(b1 & 128), opcode = b1 & 15, masked = !!(b2 & 128);
      let len = b2 & 127, pos = 2;
      if (len === 126) { if (socket.buffer.length < 4) return; len = socket.buffer.readUInt16BE(2); pos = 4; }
      else if (len === 127) { if (socket.buffer.length < 10) return; len = Number(socket.buffer.readBigUInt64BE(2)); pos = 10; }
      if (len > 65536) { socket.destroy(); return; }
      let mask;
      if (masked) { if (socket.buffer.length < pos + 4) return; mask = socket.buffer.subarray(pos, pos + 4); pos += 4; }
      if (!masked) { socket.destroy(); return; }
      if (socket.buffer.length < pos + len) return;
      let payload = socket.buffer.subarray(pos, pos + len); payload = Buffer.from(payload.map((v, i) => v ^ mask[i % 4]));
      socket.buffer = socket.buffer.subarray(pos + len);
      if (!fin) { socket.destroy(); return; }
      if (opcode === 8) { socket.end(); return; }
      if (opcode === 9) { if (len <= 125) socket.write(Buffer.concat([Buffer.from([0x8a, len]), payload])); continue; }
      if (opcode === 10) continue;
      if (opcode === 1) handleMessage(socket, id, payload.toString());
    }
  };
  socket.on('data', socket.receive);

  const cleanup = () => {
    if (socket.wsClosed) return;
    socket.wsClosed = true; socket.wsReadyState = 3;
    pendingSockets.delete(socket);
    removeClient(id);
  };
  socket.on('close', cleanup);
  socket.on('end', cleanup);
  socket.on('error', () => socket.destroy());
});

function finite(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function handleMessage(socket, id, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg !== 'object') return;

  if (msg.op === 'join') {
    if (socket.joined) return;
    const profileId = String(msg.profileId || id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || id;
    const name = String(msg.name || 'Ashen Warrior').replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Ashen Warrior';
    pendingSockets.delete(socket); socket.joined = true;
    const c = { id, ws: socket, name, profileId, x: 0, y: 145, hp: 100, dir: -Math.PI / 2, deathCounted: false };
    clients.set(id, c);
    const profile = safeProfile(profileId);
    profile.matches = (profile.matches || 0) + 1;
    saveProfiles();
    send(socket, 'joined', { id, boss: { hp: boss.hp, max: boss.max, phase: boss.phase }, players: snapshot().players, profile });
    broadcast('join', { id, name, x: c.x, y: c.y, hp: c.hp, dir: c.dir, profile });
    return;
  }

  const c = clients.get(id); if (!c) return;
  const now = Date.now();
  if (msg.op === 'state') {
    if (now - socket.lastState < 40) return;
    socket.lastState = now;
    c.x = finite(msg.x, c.x, -700, 700);
    c.y = finite(msg.y, c.y, -700, 700);
    c.dir = finite(msg.dir, c.dir, -Math.PI * 2, Math.PI * 2);
    const previousHp = c.hp;
    c.hp = finite(msg.hp, c.hp, 0, 100);
    if (previousHp > 0 && c.hp <= 0 && !c.deathCounted) {
      const profile = safeProfile(c.profileId);
      profile.deaths = (profile.deaths || 0) + 1;
      c.deathCounted = true;
      saveProfiles();
      send(socket, 'profile', { profile });
    }
    broadcast('player', { id, name: c.name, x: c.x, y: c.y, hp: c.hp, dir: c.dir });
  }
  if (msg.op === 'hit') {
    const dir = finite(msg.dir, c.dir, -Math.PI * 2, Math.PI * 2);
    const dx = -c.x, dy = -15 - c.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const difference = Math.atan2(Math.sin(angle - dir), Math.cos(angle - dir));
    if (c.hp <= 0 || distance > 178 || Math.abs(difference) >= 1.17 || now - socket.lastHit < 300) return;
    socket.lastHit = now;
    if (boss.hp > 0) {
      boss.hp = Math.max(0, boss.hp - 20);
      boss.phase = boss.hp <= 12500 ? 3 : boss.hp <= 25000 ? 2 : boss.hp <= 37500 ? 1 : 0;
      const p = safeProfile(c.profileId);
      p.damage = (p.damage || 0) + 20;
      p.bossDamage = (p.bossDamage || 0) + 20;
      saveProfiles(); saveBoss();
      if (boss.hp === 0) {
        for (const profile of profiles.values()) {
          if ((profile.bossDamage || 0) >= 1000 && !profile.bossWinAwarded) {
            profile.wins = (profile.wins || 0) + 1;
            profile.bosses = (profile.bosses || 0) + 1;
            awardRank(profile);
            profile.bossWinAwarded = true;
          }
        }
        saveProfiles();
        for (const player of clients.values()) send(player.ws, 'profile', { profile: safeProfile(player.profileId) });
      }
      broadcast('boss', { hp: boss.hp, phase: boss.phase, hitter: id });
      if (boss.hp === 0) broadcast('defeat', { hp: 0, phase: 3 });
    }
  }
  // Client-reported victories and deaths are not authoritative.
  // Wins/ranks come from boss defeat damage; deaths come from server-received HP.
}

setInterval(() => broadcast('snapshot', snapshot()), 1000);
server.listen(port, '0.0.0.0', () => console.log(`Ashen Arena server listening on http://0.0.0.0:${port}`));
