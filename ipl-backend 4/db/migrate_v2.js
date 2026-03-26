// db/migrate_v2.js  –  run once:  node db/migrate_v2.js
require('dotenv').config();
const pool = require('../src/config/db');

const SCHEMA = `
/* ─────────────────────────────────────────
   ROOM CODES  (short join codes, e.g. "MUM7K2")
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS room_codes (
  code        VARCHAR(8)   PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL UNIQUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

/* ─────────────────────────────────────────
   ROOM MEMBERS  (who has joined which room)
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS room_members (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  user_id     INT          NOT NULL,
  team_id     INT          DEFAULT NULL,
  is_ready    TINYINT(1)   DEFAULT 0,
  joined_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member (room_id, user_id),
  FOREIGN KEY (room_id)  REFERENCES rooms(id)    ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (team_id)  REFERENCES teams(id)    ON DELETE SET NULL
);

/* ─────────────────────────────────────────
   TRADES
───────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS trades (
  id              INT          AUTO_INCREMENT PRIMARY KEY,
  room_id         VARCHAR(36)  NOT NULL,
  from_team_id    INT          NOT NULL,
  to_team_id      INT          NOT NULL,
  offer_player_id INT          NOT NULL,   -- player being offered
  want_player_id  INT          NOT NULL,   -- player being requested
  status          ENUM('pending','accepted','rejected','cancelled')
                  NOT NULL DEFAULT 'pending',
  message         VARCHAR(200) DEFAULT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_team_id)    REFERENCES teams(id),
  FOREIGN KEY (to_team_id)      REFERENCES teams(id),
  FOREIGN KEY (offer_player_id) REFERENCES players(id),
  FOREIGN KEY (want_player_id)  REFERENCES players(id),
  INDEX idx_room_trade (room_id),
  INDEX idx_to_team   (to_team_id),
  INDEX idx_from_team (from_team_id)
);
`;

(async () => {
  const conn = await pool.getConnection();
  try {
    for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
      await conn.query(stmt);
    }
    console.log('✅  V2 tables created (room_codes, room_members, trades).');
  } catch (e) {
    console.error('Migration v2 error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
