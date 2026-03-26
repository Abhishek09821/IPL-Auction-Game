// src/utils/helpers.js

export const ROLE_PILL = {
  'Batsman':       'pill-bat',
  'Bowler':        'pill-bowl',
  'All-Rounder':   'pill-ar',
  'Wicket-Keeper': 'pill-wk',
}

export const ROLE_EMOJI = {
  'Batsman':       '🏏',
  'Bowler':        '⚽',
  'All-Rounder':   '🌟',
  'Wicket-Keeper': '🧤',
}

export const IPL_TEAMS = [
  { name:'Mumbai Indians',        short:'MI',   emoji:'💙', color:'#004BA0' },
  { name:'Chennai Super Kings',   short:'CSK',  emoji:'💛', color:'#F9CD05' },
  { name:'Royal Challengers',     short:'RCB',  emoji:'❤️',  color:'#EC1C24' },
  { name:'Kolkata Knight Riders', short:'KKR',  emoji:'💜', color:'#3A225D' },
  { name:'Delhi Capitals',        short:'DC',   emoji:'🔵', color:'#4169E1' },
  { name:'Rajasthan Royals',      short:'RR',   emoji:'💗', color:'#E73C92' },
  { name:'Sunrisers Hyderabad',   short:'SRH',  emoji:'🧡', color:'#F7A721' },
  { name:'Punjab Kings',          short:'PBKS', emoji:'🔴', color:'#ED1F27' },
]

export function calcNextBid(cur) {
  if (cur < 0.5)  return parseFloat((cur + 0.10).toFixed(2))
  if (cur < 2)    return parseFloat((cur + 0.25).toFixed(2))
  if (cur < 5)    return parseFloat((cur + 0.50).toFixed(2))
  return parseFloat((cur + 1.00).toFixed(2))
}

export function stars(rating) {
  const n = Math.round(rating / 20)
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

export function fmtCr(val) {
  return `₹${Number(val).toFixed(2)} Cr`
}
