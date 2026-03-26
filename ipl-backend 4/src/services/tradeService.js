// src/services/tradeService.js
const db = require('../config/db');

/**
 * Propose a trade.
 * from_team offers `offerPlayerId` in exchange for `wantPlayerId` from to_team.
 */
async function proposeTrade({ roomId, fromTeamId, toTeamId, offerPlayerId, wantPlayerId, message }) {
  // Validate both players exist in correct squads
  const [[offerRow]] = await db.query(
    'SELECT id FROM auctions WHERE room_id=? AND team_id=? AND player_id=?',
    [roomId, fromTeamId, offerPlayerId]
  );
  if (!offerRow) throw new Error('You do not own the player you are offering');

  const [[wantRow]] = await db.query(
    'SELECT id FROM auctions WHERE room_id=? AND team_id=? AND player_id=?',
    [roomId, toTeamId, wantPlayerId]
  );
  if (!wantRow) throw new Error('Target team does not own the requested player');

  // Cancel any pending duplicate
  await db.query(
    `UPDATE trades SET status='cancelled'
     WHERE room_id=? AND from_team_id=? AND to_team_id=?
       AND offer_player_id=? AND want_player_id=? AND status='pending'`,
    [roomId, fromTeamId, toTeamId, offerPlayerId, wantPlayerId]
  );

  const [r] = await db.query(
    `INSERT INTO trades (room_id,from_team_id,to_team_id,offer_player_id,want_player_id,message)
     VALUES (?,?,?,?,?,?)`,
    [roomId, fromTeamId, toTeamId, offerPlayerId, wantPlayerId, message || null]
  );
  return r.insertId;
}

/**
 * Accept a trade – swap auction rows.
 */
async function acceptTrade(tradeId, acceptingTeamId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[trade]] = await conn.query('SELECT * FROM trades WHERE id=?', [tradeId]);
    if (!trade)                        throw new Error('Trade not found');
    if (trade.status !== 'pending')    throw new Error('Trade is no longer pending');
    if (trade.to_team_id !== acceptingTeamId) throw new Error('Not your trade to accept');

    // Swap auction ownership
    await conn.query(
      'UPDATE auctions SET team_id=? WHERE room_id=? AND player_id=? AND team_id=?',
      [trade.to_team_id, trade.room_id, trade.offer_player_id, trade.from_team_id]
    );
    await conn.query(
      'UPDATE auctions SET team_id=? WHERE room_id=? AND player_id=? AND team_id=?',
      [trade.from_team_id, trade.room_id, trade.want_player_id, trade.to_team_id]
    );

    await conn.query("UPDATE trades SET status='accepted' WHERE id=?", [tradeId]);
    await conn.commit();
    return trade;
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
}

/**
 * Reject or cancel a trade.
 */
async function updateTradeStatus(tradeId, status, teamId) {
  const [[trade]] = await db.query('SELECT * FROM trades WHERE id=?', [tradeId]);
  if (!trade) throw new Error('Trade not found');
  if (trade.status !== 'pending') throw new Error('Trade is not pending');

  if (status === 'rejected' && trade.to_team_id !== teamId) throw new Error('Not authorised');
  if (status === 'cancelled' && trade.from_team_id !== teamId) throw new Error('Not authorised');

  await db.query('UPDATE trades SET status=? WHERE id=?', [status, tradeId]);
}

/**
 * Fetch all trades for a room (enriched).
 */
async function getTradesForRoom(roomId) {
  const [rows] = await db.query(
    `SELECT t.*,
       ft.name AS from_team_name, ft.short_name AS from_short, ft.color AS from_color, ft.emoji AS from_emoji,
       tt.name AS to_team_name,   tt.short_name AS to_short,   tt.color AS to_color,   tt.emoji AS to_emoji,
       op.name AS offer_player_name, op.role AS offer_role, op.rating AS offer_rating,
       wp.name AS want_player_name,  wp.role AS want_role,  wp.rating AS want_rating
     FROM trades t
     JOIN teams   ft ON ft.id = t.from_team_id
     JOIN teams   tt ON tt.id = t.to_team_id
     JOIN players op ON op.id = t.offer_player_id
     JOIN players wp ON wp.id = t.want_player_id
     WHERE t.room_id = ?
     ORDER BY t.created_at DESC`,
    [roomId]
  );
  return rows;
}

/**
 * Fetch pending incoming trades for a specific team.
 */
async function getIncomingTrades(roomId, teamId) {
  const [rows] = await db.query(
    `SELECT t.*,
       ft.name AS from_team_name, ft.short_name AS from_short, ft.color AS from_color,
       op.name AS offer_player_name, op.role AS offer_role, op.rating AS offer_rating,
       wp.name AS want_player_name,  wp.role AS want_role,  wp.rating AS want_rating
     FROM trades t
     JOIN teams   ft ON ft.id = t.from_team_id
     JOIN players op ON op.id = t.offer_player_id
     JOIN players wp ON wp.id = t.want_player_id
     WHERE t.room_id=? AND t.to_team_id=? AND t.status='pending'
     ORDER BY t.created_at DESC`,
    [roomId, teamId]
  );
  return rows;
}

module.exports = { proposeTrade, acceptTrade, updateTradeStatus, getTradesForRoom, getIncomingTrades };
