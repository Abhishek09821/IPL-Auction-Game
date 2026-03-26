// src/routes/trades.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');
const ts     = require('../services/tradeService');

/* GET /api/trades/:roomId  – all trades */
router.get('/:roomId', auth, async (req, res) => {
  try {
    res.json(await ts.getTradesForRoom(req.params.roomId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /api/trades/:roomId/incoming/:teamId  – incoming pending */
router.get('/:roomId/incoming/:teamId', auth, async (req, res) => {
  try {
    res.json(await ts.getIncomingTrades(req.params.roomId, req.params.teamId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST /api/trades  – propose */
router.post('/', auth, async (req, res) => {
  try {
    const id = await ts.proposeTrade(req.body);
    res.status(201).json({ tradeId: id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* PATCH /api/trades/:tradeId  – accept | reject | cancel */
router.patch('/:tradeId', auth, async (req, res) => {
  const { status, teamId } = req.body;
  try {
    if (status === 'accepted') {
      await ts.acceptTrade(Number(req.params.tradeId), teamId);
    } else {
      await ts.updateTradeStatus(Number(req.params.tradeId), status, teamId);
    }
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
