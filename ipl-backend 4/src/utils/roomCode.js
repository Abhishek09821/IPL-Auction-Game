// src/utils/roomCode.js
/**
 * Generates a short, human-readable 6-char room code.
 * Uses unambiguous characters only (no 0/O/1/I/L).
 */
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generate() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a unique code (retries if collision in DB).
 * @param {object} db  – mysql2 pool
 */
async function unique(db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generate();
    const [rows] = await db.query('SELECT code FROM room_codes WHERE code = ?', [code]);
    if (!rows.length) return code;
  }
  throw new Error('Could not generate unique room code after 10 attempts');
}

module.exports = { generate, unique };
