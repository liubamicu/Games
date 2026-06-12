import { useState } from 'react'

const ITEMS = [
  { id: 'life',   icon: '♥', label: 'EXTRA LIFE',    desc: '+1 life (max 5)',              cost: 300 },
  { id: 'speed',  icon: '⚡', label: 'FASTER TRUCKS',  desc: 'Shoot 30ms faster per buy',    cost: 200 },
  { id: 'shield', icon: '🛡', label: 'SHIELD',          desc: 'Absorbs one alien hit',        cost: 400 },
  { id: 'turbo',  icon: '💨', label: 'TURBO FACTORY',  desc: 'Move +50px/s faster per buy',  cost: 150 },
]

const SKINS = [
  { id: 'rocket', group: 'factory', icon: '🚀', label: 'ROCKET HULL',    desc: 'Sleek rocket with fins',     cost: 500 },
  { id: 'castle', group: 'factory', icon: '🏰', label: 'CASTLE TOWER',   desc: 'Stone fortress battlements', cost: 500 },
  { id: 'pixel',  group: 'alien',   icon: '👾', label: 'PIXEL INVADERS', desc: 'Classic arcade sprite set',  cost: 400 },
  { id: 'ghost',  group: 'alien',   icon: '👻', label: 'GHOST SWARM',    desc: 'Drifting spirit enemies',    cost: 400 },
]

export default function Shop({ wave, score, initialPoints, initialLives, upgrades, onFinish }) {
  const [points, setPoints] = useState(initialPoints)
  const [lives, setLives]   = useState(initialLives)
  const [ups, setUps]       = useState(upgrades)
  const [bought, setBought] = useState([])

  function buy(item) {
    if (points < item.cost) return
    if (item.id === 'life' && lives >= 5) return
    if (bought.filter(b => b === item.id).length >= 3) return
    setPoints(p => p - item.cost)
    setBought(b => [...b, item.id])
    if (item.id === 'life')   setLives(l => l + 1)
    if (item.id === 'speed')  setUps(u => ({ ...u, cooldownReduction: u.cooldownReduction + 30 }))
    if (item.id === 'shield') setUps(u => ({ ...u, shields: u.shields + 1 }))
    if (item.id === 'turbo')  setUps(u => ({ ...u, speedBonus: u.speedBonus + 50 }))
  }

  function buySkin(skin) {
    const key = skin.group + 'Skin'
    if (points < skin.cost) return
    if (ups[key] !== 'default') return
    setPoints(p => p - skin.cost)
    setUps(u => ({ ...u, [key]: skin.id }))
  }

  return (
    <div style={st.page}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🍌🍌🍌🍌🍌</div>
      <h1 style={st.title}>FACTORY UPGRADES</h1>
      <p style={st.subtitle}>Wave {wave - 1} cleared — shop before Wave {wave}</p>

      <div style={st.statsRow}>
        <span style={st.stat}>SCORE: <strong style={st.gold}>{score}</strong></span>
        <span style={st.stat}>CREDITS: <strong style={st.gold}>{points}</strong></span>
        <span style={st.stat}>LIVES: {'♥ '.repeat(lives).trim()}</span>
        <span style={st.stat}>SHIELDS: {ups.shields}</span>
      </div>

      <div style={st.sectionLabel}>UPGRADES</div>
      <div style={st.grid}>
        {ITEMS.map(item => {
          const timesBought = bought.filter(b => b === item.id).length
          const disabled = points < item.cost || (item.id === 'life' && lives >= 5) || timesBought >= 3
          return (
            <div key={item.id} style={{ ...st.card, ...(disabled ? st.cardDim : {}) }}>
              <div style={st.icon}>{item.icon}</div>
              <div style={st.name}>{item.label}</div>
              <div style={st.desc}>{item.desc}</div>
              {timesBought > 0 && <div style={st.badge}>×{timesBought} bought</div>}
              <button
                style={{ ...st.btn, ...(disabled ? st.btnOff : {}) }}
                onClick={() => buy(item)}
                disabled={disabled}
              >
                {item.cost} PTS
              </button>
            </div>
          )
        })}
      </div>

      <div style={st.sectionLabel}>SKINS</div>
      <div style={st.grid}>
        {SKINS.map(skin => {
          const key = skin.group + 'Skin'
          const isActive = ups[key] === skin.id
          const slotTaken = ups[key] !== 'default' && !isActive
          const disabled = slotTaken || (!isActive && points < skin.cost)
          const tagColor = skin.group === 'factory' ? '#4488FF' : '#FF8800'
          return (
            <div key={skin.id} style={{ ...st.card, ...(disabled ? st.cardDim : {}), ...(isActive ? st.cardActive : {}) }}>
              <div style={st.icon}>{skin.icon}</div>
              <div style={st.name}>{skin.label}</div>
              <div style={st.desc}>{skin.desc}</div>
              <div style={{ ...st.skinTag, color: tagColor }}>
                {skin.group === 'factory' ? 'FACTORY SKIN' : 'ALIEN SKIN'}
              </div>
              {isActive && <div style={st.badge}>✓ ACTIVE</div>}
              <button
                style={{ ...st.btn, ...(disabled || isActive ? st.btnOff : {}) }}
                onClick={() => buySkin(skin)}
                disabled={disabled || isActive}
              >
                {isActive ? 'OWNED' : slotTaken ? 'SLOT TAKEN' : `${skin.cost} PTS`}
              </button>
            </div>
          )
        })}
      </div>

      <button style={st.startBtn} onClick={() => onFinish(points, lives, ups)}>
        START WAVE {wave} →
      </button>
    </div>
  )
}

const GOLD = '#b8860b'
const st = {
  page:         { minHeight: '100vh', background: '#fafad2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.5rem 2rem', fontFamily: 'Courier New', overflowY: 'auto' },
  title:        { color: GOLD, fontSize: '2.2rem', letterSpacing: 6, marginBottom: '0.3rem', textAlign: 'center' },
  subtitle:     { color: '#888', fontSize: '0.9rem', letterSpacing: 2, marginBottom: '1rem' },
  statsRow:     { display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' },
  stat:         { color: GOLD, fontSize: '1rem', letterSpacing: 2 },
  gold:         { color: GOLD, fontWeight: 'bold' },
  sectionLabel: { color: GOLD, fontSize: '0.75rem', letterSpacing: 4, borderBottom: `1px solid ${GOLD}`, width: '100%', maxWidth: 600, textAlign: 'left', paddingBottom: '0.3rem', marginBottom: '0.6rem', marginTop: '0.5rem' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', maxWidth: 600, width: '100%', marginBottom: '0.5rem' },
  card:         { border: `2px solid ${GOLD}`, padding: '1rem', textAlign: 'center', background: '#fffef0', transition: 'opacity 0.2s' },
  cardDim:      { opacity: 0.45 },
  cardActive:   { borderColor: '#4a8010', background: '#f0fff4' },
  icon:         { fontSize: '1.8rem', marginBottom: '0.3rem' },
  name:         { color: GOLD, fontWeight: 'bold', letterSpacing: 2, marginBottom: '0.2rem', fontSize: '0.9rem' },
  desc:         { color: '#666', fontSize: '0.75rem', marginBottom: '0.4rem', minHeight: '2em' },
  badge:        { color: '#4a8010', fontSize: '0.75rem', marginBottom: '0.3rem' },
  skinTag:      { fontSize: '0.7rem', letterSpacing: 2, marginBottom: '0.3rem', fontWeight: 'bold' },
  btn:          { background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '0.35rem 1rem', cursor: 'pointer', letterSpacing: 2, fontSize: '0.85rem' },
  btnOff:       { cursor: 'not-allowed', borderColor: '#ccc', color: '#ccc' },
  startBtn:     { background: 'transparent', border: `2px solid ${GOLD}`, color: GOLD, padding: '0.9rem 3rem', cursor: 'pointer', letterSpacing: 4, fontSize: '1.1rem', marginTop: '1rem' },
}
