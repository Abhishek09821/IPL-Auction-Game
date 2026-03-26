// src/socket/index.js  (v2)
const jwt = require('jsonwebtoken');
const db  = require('../config/db');
const am  = require('./auctionManager');
const { simulateLeague, simulatePlayoffs } = require('../services/matchSimulator');
const ts  = require('../services/tradeService');

module.exports = function attachSockets(io) {

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No auth token'));
    try { socket.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { next(new Error('Invalid token')); }
  });

  async function broadcastLobby(roomId) {
    const [members] = await db.query(
      `SELECT rm.*, u.username FROM room_members rm
       JOIN users u ON u.id=rm.user_id WHERE rm.room_id=?`, [roomId]);
    const [teams] = await db.query(
      'SELECT id,name,short_name,color,emoji,budget,is_ai,user_id FROM teams WHERE room_id=? ORDER BY id',
      [roomId]);
    io.to(roomId).emit('lobby:state', { members, teams });
  }

  async function broadcastTrades(roomId) {
    const trades = await ts.getTradesForRoom(roomId);
    io.to(roomId).emit('trades:update', trades);
  }

  io.on('connection', socket => {
    console.log(`🟢 Socket: ${socket.id} (user ${socket.user.id})`);

    /* ROOM JOIN */
    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room) return ack({ error: 'Room not found' });

        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = socket.user.id;

        await db.query('INSERT IGNORE INTO room_members (room_id,user_id) VALUES (?,?)',
          [roomId, socket.user.id]);

        const [[team]] = await db.query(
          'SELECT * FROM teams WHERE room_id=? AND user_id=?', [roomId, socket.user.id]);
        socket.teamId = team?.id ?? null;

        const [teams]     = await db.query('SELECT id,name,short_name,color,emoji,budget,is_ai,user_id FROM teams WHERE room_id=? ORDER BY id', [roomId]);
        const [players]   = await db.query('SELECT * FROM players ORDER BY rating DESC');
        const [[codeRow]] = await db.query('SELECT code FROM room_codes WHERE room_id=?', [roomId]);
        const [members]   = await db.query(`SELECT rm.*, u.username FROM room_members rm JOIN users u ON u.id=rm.user_id WHERE rm.room_id=?`, [roomId]);

        ack({ ok:true, room, teams, players, yourTeamId: socket.teamId, code: codeRow?.code, members });

        socket.to(roomId).emit('room:member_joined', { userId: socket.user.id, username: socket.user.username });
        await broadcastLobby(roomId);
      } catch (e) { ack({ error: e.message }); }
    });

    /* CLAIM TEAM */
    socket.on('lobby:claim_team', async ({ roomId, teamId }, ack) => {
      try {
        const conn = await db.getConnection();
        await conn.beginTransaction();
        const [[t]] = await conn.query('SELECT * FROM teams WHERE id=? AND room_id=?', [teamId, roomId]);
        if (!t || (!t.is_ai && t.user_id !== socket.user.id)) {
          await conn.rollback(); conn.release(); return ack({ error: 'Already claimed' });
        }
        await conn.query('UPDATE teams SET is_ai=1,user_id=NULL WHERE room_id=? AND user_id=?', [roomId, socket.user.id]);
        await conn.query('UPDATE teams SET is_ai=0,user_id=? WHERE id=?', [socket.user.id, teamId]);
        await conn.query('UPDATE room_members SET team_id=? WHERE room_id=? AND user_id=?', [teamId, roomId, socket.user.id]);
        await conn.commit(); conn.release();
        socket.teamId = teamId;
        ack({ ok: true });
        await broadcastLobby(roomId);
      } catch (e) { ack({ error: e.message }); }
    });

    /* READY TOGGLE */
    socket.on('lobby:ready', async ({ roomId, ready }, ack) => {
      try {
        await db.query('UPDATE room_members SET is_ready=? WHERE room_id=? AND user_id=?',
          [ready ? 1 : 0, roomId, socket.user.id]);
        ack({ ok: true });
        await broadcastLobby(roomId);
      } catch (e) { ack({ error: e.message }); }
    });

    /* START AUCTION */
    socket.on('auction:start', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room) return ack({ error: 'Room not found' });
        if (room.host_id !== socket.user.id) return ack({ error: 'Host only' });
        if (room.status !== 'waiting') return ack({ error: 'Already started' });
        await db.query("UPDATE rooms SET status='auction' WHERE id=?", [roomId]);
        io.to(roomId).emit('auction:started');   // ← tells all clients to switch screen
        const aRoom = await am.initRoom(io, roomId);
        aRoom.start();
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* BID */
    socket.on('auction:bid', ({ roomId }, ack) => {
      if (!socket.teamId) return ack({ error: 'No team' });
      const aRoom = am.getRoom(roomId);
      if (!aRoom) return ack({ error: 'Not active' });
      ack(aRoom.humanBid(socket.teamId));
    });

    /* PROPOSE TRADE */
    socket.on('trade:propose', async ({ roomId, toTeamId, offerPlayerId, wantPlayerId, message }, ack) => {
      try {
        if (!socket.teamId) return ack({ error: 'No team' });
        const tradeId = await ts.proposeTrade({
          roomId, fromTeamId: socket.teamId, toTeamId, offerPlayerId, wantPlayerId, message
        });
        io.to(roomId).emit('trade:incoming', { tradeId, fromTeamId: socket.teamId, toTeamId });
        await broadcastTrades(roomId);
        ack({ ok: true, tradeId });
      } catch (e) { ack({ error: e.message }); }
    });

    /* ACCEPT TRADE */
    socket.on('trade:accept', async ({ roomId, tradeId }, ack) => {
      try {
        if (!socket.teamId) return ack({ error: 'No team' });
        await ts.acceptTrade(tradeId, socket.teamId);
        io.to(roomId).emit('trade:completed', { tradeId });
        await broadcastTrades(roomId);
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* REJECT TRADE */
    socket.on('trade:reject', async ({ roomId, tradeId }, ack) => {
      try {
        await ts.updateTradeStatus(tradeId, 'rejected', socket.teamId);
        io.to(roomId).emit('trade:rejected', { tradeId });
        await broadcastTrades(roomId);
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* CANCEL TRADE */
    socket.on('trade:cancel', async ({ roomId, tradeId }, ack) => {
      try {
        await ts.updateTradeStatus(tradeId, 'cancelled', socket.teamId);
        io.to(roomId).emit('trade:cancelled', { tradeId });
        await broadcastTrades(roomId);
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* CLOSE TRADING WINDOW */
    socket.on('trade:close', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (room?.host_id !== socket.user.id) return ack({ error: 'Host only' });
        await db.query("UPDATE rooms SET status='season' WHERE id=?", [roomId]);
        io.to(roomId).emit('trade:window_closed');
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* SIMULATE SEASON */
    socket.on('season:simulate', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room) return ack({ error: 'Room not found' });
        if (room.host_id !== socket.user.id) return ack({ error: 'Host only' });
        if (room.status !== 'season') return ack({ error: 'Not in season stage' });
        io.to(roomId).emit('season:started');
        const results = await simulateLeague(roomId);
        io.to(roomId).emit('season:complete', { results });
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* SIMULATE PLAYOFFS */
    socket.on('playoffs:simulate', async ({ roomId }, ack) => {
      try {
        const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
        if (!room) return ack({ error: 'Room not found' });
        if (room.host_id !== socket.user.id) return ack({ error: 'Host only' });
        if (room.status !== 'playoffs') return ack({ error: 'Not in playoffs stage' });
        const result = await simulatePlayoffs(roomId);
        io.to(roomId).emit('playoffs:complete', result);
        ack({ ok: true });
      } catch (e) { ack({ error: e.message }); }
    });

    /* DISCONNECT */
    socket.on('disconnect', async () => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit('room:member_left',
          { userId: socket.user.id, username: socket.user.username });
      }
    });
  });
};
