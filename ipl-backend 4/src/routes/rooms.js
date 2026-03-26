// src/routes/rooms.js  (v2)
const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const rc      = require('../utils/roomCode');

const IPL_TEAMS = [
  { name:'Mumbai Indians',        short_name:'MI',   color:'#004BA0', emoji:'💙' },
  { name:'Chennai Super Kings',   short_name:'CSK',  color:'#F9CD05', emoji:'💛' },
  { name:'Royal Challengers',     short_name:'RCB',  color:'#EC1C24', emoji:'❤️'  },
  { name:'Kolkata Knight Riders', short_name:'KKR',  color:'#3A225D', emoji:'💜' },
  { name:'Delhi Capitals',        short_name:'DC',   color:'#4169E1', emoji:'🔵' },
  { name:'Rajasthan Royals',      short_name:'RR',   color:'#E73C92', emoji:'💗' },
  { name:'Sunrisers Hyderabad',   short_name:'SRH',  color:'#F7A721', emoji:'🧡' },
  { name:'Punjab Kings',          short_name:'PBKS', color:'#ED1F27', emoji:'🔴' },
];

async function createTeamsForRoom(conn, roomId) {
  const teamIds = [];
  for (const t of IPL_TEAMS) {
    const [r] = await conn.query(
      `INSERT INTO teams (room_id,name,short_name,color,emoji,budget,is_ai,user_id)
       VALUES (?,?,?,?,?,100.00,1,NULL)`,
      [roomId, t.name, t.short_name, t.color, t.emoji]
    );
    teamIds.push(r.insertId);
  }
  for (const id of teamIds) {
    await conn.query('INSERT INTO points (room_id,team_id) VALUES (?,?)', [roomId, id]);
  }
  return teamIds;
}

/* POST /api/rooms  – create */
router.post('/', auth, async (req, res) => {
  const roomId = uuid();
  const userId = req.user.id;
  const conn   = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO rooms (id,host_id) VALUES (?,?)', [roomId, userId]);
    await createTeamsForRoom(conn, roomId);
    const code = await rc.unique(db);
    await conn.query('INSERT INTO room_codes (code,room_id) VALUES (?,?)', [code, roomId]);
    await conn.query('INSERT INTO room_members (room_id,user_id) VALUES (?,?)', [roomId, userId]);
    await conn.commit();
    res.status(201).json({ roomId, code });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

/* POST /api/rooms/join  – join by code */
router.post('/join', auth, async (req, res) => {
  const clean = String(req.body.code || '').toUpperCase().trim();
  if (!clean) return res.status(400).json({ error: 'Code required' });
  try {
    const [[row]] = await db.query(
      `SELECT rc.room_id FROM room_codes rc
       JOIN rooms r ON r.id=rc.room_id
       WHERE rc.code=? AND r.status='waiting'`,
      [clean]
    );
    if (!row) return res.status(404).json({ error: 'Invalid code or room already started' });
    await db.query('INSERT IGNORE INTO room_members (room_id,user_id) VALUES (?,?)',
      [row.room_id, req.user.id]);
    res.json({ roomId: row.room_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/rooms/:roomId/claim-team */
router.post('/:roomId/claim-team', auth, async (req, res) => {
  const { roomId } = req.params;
  const { teamId } = req.body;
  const userId     = req.user.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[team]] = await conn.query('SELECT * FROM teams WHERE id=? AND room_id=?', [teamId, roomId]);
    if (!team) throw new Error('Team not found');
    if (!team.is_ai && team.user_id !== userId) throw new Error('Team already claimed');
    // Release previous
    await conn.query('UPDATE teams SET is_ai=1, user_id=NULL WHERE room_id=? AND user_id=?', [roomId, userId]);
    // Claim
    await conn.query('UPDATE teams SET is_ai=0, user_id=? WHERE id=?', [userId, teamId]);
    await conn.query('UPDATE room_members SET team_id=? WHERE room_id=? AND user_id=?', [teamId, roomId, userId]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

/* POST /api/rooms/:roomId/ready */
router.post('/:roomId/ready', auth, async (req, res) => {
  const { roomId } = req.params;
  const ready = req.body.ready ? 1 : 0;
  try {
    await db.query('UPDATE room_members SET is_ready=? WHERE room_id=? AND user_id=?',
      [ready, roomId, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/rooms/:roomId */
router.get('/:roomId', auth, async (req, res) => {
  const { roomId } = req.params;
  try {
    const [[room]] = await db.query('SELECT * FROM rooms WHERE id=?', [roomId]);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const [teams]   = await db.query('SELECT * FROM teams WHERE room_id=? ORDER BY id', [roomId]);
    const [[codeRow]] = await db.query('SELECT code FROM room_codes WHERE room_id=?', [roomId]);
    const [members] = await db.query(
      `SELECT rm.*, u.username FROM room_members rm
       JOIN users u ON u.id=rm.user_id WHERE rm.room_id=?`, [roomId]
    );
    res.json({ room, teams, code: codeRow?.code, members });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/rooms/:roomId/squad/:teamId */
router.get('/:roomId/squad/:teamId', auth, async (req, res) => {
  const { roomId, teamId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT p.*, a.sold_price FROM auctions a
       JOIN players p ON p.id=a.player_id
       WHERE a.room_id=? AND a.team_id=?`,
      [roomId, teamId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
