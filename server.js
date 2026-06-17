'use strict';
const http   = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const PORT  = process.env.PORT || 3001;
const rooms = new Map(); // roomId -> Set<ws>

function genRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Prompter collaboration server\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws._roomId = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'create') {
      const roomId = genRoomId();
      rooms.set(roomId, new Set([ws]));
      ws._roomId = roomId;
      ws.send(JSON.stringify({ type: 'created', roomId }));

    } else if (msg.type === 'join') {
      const roomId = (msg.roomId || '').toUpperCase();
      if (!rooms.has(roomId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      const room = rooms.get(roomId);
      room.add(ws);
      ws._roomId = roomId;
      const peerCount = room.size;
      ws.send(JSON.stringify({ type: 'joined', roomId, peerCount }));
      broadcast(room, ws, { type: 'peer-joined', peerCount });

    } else if (msg.type === 'state-sync') {
      const room = ws._roomId ? rooms.get(ws._roomId) : null;
      if (room) broadcast(room, ws, { type: 'state-update', state: msg.state });
    }
  });

  ws.on('close', () => {
    const roomId = ws._roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      broadcast(room, null, { type: 'peer-left', peerCount: room.size });
    }
  });
});

function broadcast(room, exclude, msg) {
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client !== exclude && client.readyState === 1) {
      client.send(data);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Prompter collab server running on ws://localhost:${PORT}`);
});
