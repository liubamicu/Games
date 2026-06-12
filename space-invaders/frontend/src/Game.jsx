import { useEffect, useRef, useState, useCallback } from 'react'

const W = 800, H = 600
const PLAYER_W = 40, PLAYER_H = 20
const BULLET_W = 3, BULLET_H = 12
const ALIEN_COLS = 11, ALIEN_ROWS = 5
const ALIEN_W = 36, ALIEN_H = 24
const POWERUP_W = 20, POWERUP_H = 20

function makeAliens(wave) {
  const rows = Math.min(5 + Math.floor((wave - 1) / 2), 8)
  const startY = 70 + Math.min((wave - 1) * 6, 48)
  const aliens = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      aliens.push({ x: 60 + c * 58, y: startY + r * 40, alive: true, type: r === 0 ? 2 : r <= 2 ? 1 : 0 })
    }
  }
  return aliens
}

function pointsForType(t) { return t === 2 ? 15 : t === 1 ? 10 : 5 }

function initState(wave, prevScore = 0, prevPoints = 0, prevLives = 3, upgrades = { cooldownReduction: 0, shields: 0, speedBonus: 0 }) {
  return {
    player: { x: W / 2 - PLAYER_W / 2, y: H - 60 },
    bullets: [],
    alienBullets: [],
    aliens: makeAliens(wave),
    alienDir: 1,
    alienMoveTimer: 0,
    alienMoveInterval: Math.max(200 - wave * 15, 25),
    alienStepSize: Math.min(8 + wave * 2, 30),
    alienDropSize: Math.min(14 + wave * 3, 50),
    alienShootTimer: 0,
    alienShootInterval: Math.max(1400 - wave * 110, 150),
    alienShooters: Math.min(1 + Math.floor((wave + 1) / 2), 6),
    alienBulletSpeed: Math.min(180 + wave * 45, 800),
    score: prevScore,
    points: prevPoints,
    wave,
    lives: prevLives,
    shootCooldown: 0,
    baseShootCooldown: Math.max(180 - upgrades.cooldownReduction, 50),
    shields: upgrades.shields,
    playerSpeed: 280 + upgrades.speedBonus,
    factorySkin: upgrades.factorySkin || 'default',
    alienSkin: upgrades.alienSkin || 'default',
    powerUps: [],
    powerUpTimer: 0,
    powerUpSpawnIn: 9000 + Math.random() * 6000,
    speedBoost: 0,
    lastTime: null,
  }
}

export default function Game({ onGameOver, initialWave = 1, initialScore = 0, initialPoints = 0, initialLives = 3, upgrades = { cooldownReduction: 0, shields: 0, speedBonus: 0 } }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const [overlay, setOverlay] = useState(null) // null | 'dead' | 'win'
  const overlayRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  const startLoop = useCallback((ctx) => {
    cancelAnimationFrame(animRef.current)

    function loop(ts) {
      if (overlayRef.current !== null) return
      if (pausedRef.current) return
      const s = stateRef.current
      if (!s) return

      const dt = s.lastTime ? Math.min(ts - s.lastTime, 50) : 16
      s.lastTime = ts

      // Player movement
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA'])
        s.player.x = Math.max(0, s.player.x - s.playerSpeed * dt / 1000)
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD'])
        s.player.x = Math.min(W - PLAYER_W, s.player.x + s.playerSpeed * dt / 1000)

      // Player shoot
      s.shootCooldown = Math.max(0, s.shootCooldown - dt)
      if ((keysRef.current['Space'] || keysRef.current['ArrowUp']) && s.shootCooldown === 0) {
        s.bullets.push({ x: s.player.x + PLAYER_W / 2 - BULLET_W / 2, y: s.player.y })
        s.shootCooldown = s.speedBoost > 0 ? 70 : s.baseShootCooldown
      }

      // Player bullets move
      s.bullets = s.bullets.filter(b => { b.y -= 520 * dt / 1000; return b.y + BULLET_H > 0 })

      // Aliens move
      s.alienMoveTimer += dt
      if (s.alienMoveTimer >= s.alienMoveInterval) {
        s.alienMoveTimer = 0
        const alive = s.aliens.filter(a => a.alive)
        if (alive.length === 0) return
        const minX = Math.min(...alive.map(a => a.x))
        const maxX = Math.max(...alive.map(a => a.x + ALIEN_W))
        if ((s.alienDir === 1 && maxX >= W - 10) || (s.alienDir === -1 && minX <= 10)) {
          s.aliens.forEach(a => { if (a.alive) a.y += s.alienDropSize })
          s.alienDir *= -1
          s.alienMoveInterval = Math.max(s.alienMoveInterval - 6, 25)
        } else {
          s.aliens.forEach(a => { if (a.alive) a.x += s.alienDir * s.alienStepSize })
        }
      }

      // Aliens shoot
      s.alienShootTimer += dt
      if (s.alienShootTimer >= s.alienShootInterval) {
        s.alienShootTimer = 0
        const cols = {}
        s.aliens.forEach(a => {
          if (!a.alive) return
          const col = Math.round(a.x)
          if (!cols[col] || a.y > cols[col].y) cols[col] = a
        })
        const shooters = Object.values(cols)
        const count = Math.min(s.alienShooters, shooters.length)
        const shuffled = shooters.sort(() => Math.random() - 0.5).slice(0, count)
        shuffled.forEach(sh => {
          s.alienBullets.push({ x: sh.x + ALIEN_W / 2 - BULLET_W / 2, y: sh.y + ALIEN_H })
        })
      }

      // Alien bullets move
      s.alienBullets = s.alienBullets.filter(b => {
        b.y += s.alienBulletSpeed * dt / 1000
        return b.y < H
      })

      // Spawn power-ups
      s.powerUpTimer += dt
      if (s.powerUpTimer >= s.powerUpSpawnIn) {
        s.powerUpTimer = 0
        s.powerUpSpawnIn = 9000 + Math.random() * 6000
        s.powerUps.push({ x: 20 + Math.random() * (W - 60), y: 38, type: Math.random() < 0.5 ? 'speed' : 'heart' })
      }

      // Move power-ups, collect via bullet hit or player touch
      const hitIdx = new Set()
      s.bullets = s.bullets.filter(b => {
        for (let i = 0; i < s.powerUps.length; i++) {
          const p = s.powerUps[i]
          if (b.x < p.x + POWERUP_W && b.x + BULLET_W > p.x && b.y < p.y + POWERUP_H && b.y + BULLET_H > p.y) {
            hitIdx.add(i); return false
          }
        }
        return true
      })
      s.powerUps = s.powerUps.filter((p, i) => {
        if (hitIdx.has(i)) { applyPowerUp(s, p.type); return false }
        p.y += 55 * dt / 1000
        if (p.x < s.player.x + PLAYER_W + 6 && p.x + POWERUP_W > s.player.x - 6 &&
            p.y + POWERUP_H > s.player.y && p.y < s.player.y + PLAYER_H) {
          applyPowerUp(s, p.type); return false
        }
        return p.y < H - 30
      })

      // Speed boost countdown
      if (s.speedBoost > 0) s.speedBoost = Math.max(0, s.speedBoost - dt)

      // Bullet-alien collisions
      s.bullets = s.bullets.filter(b => {
        for (const a of s.aliens) {
          if (!a.alive) continue
          if (b.x < a.x + ALIEN_W && b.x + BULLET_W > a.x && b.y < a.y + ALIEN_H && b.y + BULLET_H > a.y) {
            a.alive = false
            const pts = pointsForType(a.type)
            s.score += pts
            s.points += pts
            return false
          }
        }
        return true
      })

      // Alien bullet hits player
      for (const b of [...s.alienBullets]) {
        if (b.x < s.player.x + PLAYER_W && b.x + BULLET_W > s.player.x &&
            b.y < s.player.y + PLAYER_H && b.y + BULLET_H > s.player.y) {
          s.alienBullets = s.alienBullets.filter(ab => ab !== b)
          s.player.x = W / 2 - PLAYER_W / 2
          if (s.shields > 0) {
            s.shields -= 1
          } else {
            s.lives -= 1
            if (s.lives <= 0) { overlayRef.current = 'dead'; setOverlay('dead'); return }
          }
          break
        }
      }

      // Aliens reach bottom
      for (const a of s.aliens) {
        if (a.alive && a.y + ALIEN_H >= s.player.y) { overlayRef.current = 'dead'; setOverlay('dead'); return }
      }

      // Wave cleared
      if (s.aliens.every(a => !a.alive)) {
        overlayRef.current = 'win'
        setOverlay('win')
        return
      }

      draw(ctx, s)
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    stateRef.current = initState(initialWave, initialScore, initialPoints, initialLives, upgrades)
    overlayRef.current = null
    setOverlay(null)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function onKey(e) {
      keysRef.current[e.code] = e.type === 'keydown'
      if (e.type === 'keydown' && e.code === 'Escape' && overlayRef.current === null) {
        const nowPaused = !pausedRef.current
        pausedRef.current = nowPaused
        setPaused(nowPaused)
        if (!nowPaused) {
          stateRef.current.lastTime = null
          startLoop(canvasRef.current.getContext('2d'))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    startLoop(ctx)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [startLoop])

  function togglePause() {
    if (overlayRef.current !== null) return
    const nowPaused = !pausedRef.current
    pausedRef.current = nowPaused
    setPaused(nowPaused)
    if (!nowPaused) {
      stateRef.current.lastTime = null
      startLoop(canvasRef.current.getContext('2d'))
    }
  }

  function handleShop() {
    const s = stateRef.current
    if (onGameOver) onGameOver('waveCleared', s.score, s.wave + 1, s.lives, s.points)
  }

  function handleRestart() {
    if (onGameOver) onGameOver('restart')
  }

  function handleMenu() {
    if (onGameOver) onGameOver('menu')
  }

  function handleSubmit() {
    if (onGameOver) onGameOver('submit', stateRef.current.score, stateRef.current.wave)
  }

  const s = stateRef.current

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: W }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ display: 'block', border: '1px solid #b8860b', width: '100%', height: 'auto' }} />

      {overlay === null && (
        <button style={ov.pauseBtn} onClick={togglePause}>
          {paused ? '▶' : '⏸'}
        </button>
      )}

      {paused && (
        <div style={ov.overlay}>
          <h2 style={{ ...ov.title, color: '#b8860b', textShadow: 'none', fontSize: '4rem' }}>PAUSED</h2>
          <p style={{ color: '#888', fontSize: '0.85rem', letterSpacing: 2, margin: '0.5rem 0 1.5rem' }}>ESC or click to resume</p>
          <button style={{ ...ov.btn, borderColor: '#b8860b', color: '#b8860b', textShadow: 'none', boxShadow: 'none' }} onClick={togglePause}>
            ▶ RESUME
          </button>
        </div>
      )}

      {overlay === 'dead' && (
        <div style={ov.overlay}>
          <h2 style={ov.title}>GAME OVER</h2>
          <p style={ov.sub}>Score: {s?.score ?? 0}</p>
          <p style={ov.sub}>Wave: {s?.wave ?? 1}</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={ov.btn} onClick={handleSubmit}>SAVE SCORE</button>
            <button style={ov.btn} onClick={handleRestart}>PLAY AGAIN</button>
            <button style={ov.btn} onClick={handleMenu}>BACK</button>
          </div>
        </div>
      )}

      {overlay === 'win' && (
        <div style={ov.overlay}>
          <h2 style={ov.title}>🍌 BANANA PEELED! 🍌</h2>
          <p style={{ ...ov.sub, fontSize: '1.2rem' }}>WAVE {s?.wave ?? 1} CLEARED</p>
          <p style={ov.sub}>Score: {s?.score ?? 0}</p>
          <p style={{ ...ov.sub, fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Wave {(s?.wave ?? 1) + 1}: {waveDesc((s?.wave ?? 1) + 1)}
          </p>
          <button style={{ ...ov.btn, marginTop: '1.5rem' }} onClick={handleShop}>
            SHOP →
          </button>
        </div>
      )}
    </div>
  )
}

function waveDesc(wave) {
  const bullets = Math.min(1 + Math.floor((wave + 1) / 2), 6)
  const rows = Math.min(5 + Math.floor((wave - 1) / 2), 8)
  return `${rows} rows · ${bullets} bullet${bullets > 1 ? 's' : ''} per volley`
}

const NEON = '#00FF44'
const NEON_GLOW = `0 0 8px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON}`
const ov = {
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,20,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  title: { color: NEON, fontSize: '5rem', letterSpacing: 10, marginBottom: '1rem', textShadow: NEON_GLOW, fontFamily: 'Courier New' },
  sub: { color: NEON, fontSize: '1.8rem', margin: '0.5rem 0', textShadow: NEON_GLOW },
  btn: { background: 'transparent', border: `2px solid ${NEON}`, color: NEON, padding: '0.8rem 2.5rem', cursor: 'pointer', letterSpacing: 3, fontSize: '1.2rem', textShadow: NEON_GLOW, boxShadow: `0 0 10px ${NEON}` },
  pauseBtn: { position: 'absolute', top: 6, right: 6, background: 'transparent', border: '1px solid #b8860b', color: '#b8860b', padding: '2px 10px', cursor: 'pointer', fontFamily: 'Courier New', fontSize: '1rem', zIndex: 5 },
}

function draw(ctx, s) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#fafad2'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#b8860b'
  ctx.font = '16px Courier New'
  ctx.fillText(`SCORE: ${s.score}`, 10, 22)
  ctx.fillText(`WAVE: ${s.wave}`, 330, 22)
  ctx.fillText(`LIVES: ${'♥ '.repeat(s.lives).trim()}`, 500, 22)
  if (s.shields > 0) ctx.fillText(`SHIELD:${s.shields}`, 690, 22)
  ctx.fillText(`CREDITS: ${s.points}`, 10, 44)
  if (s.speedBoost > 0) {
    const flash = Math.floor(Date.now() / 250) % 2 === 0
    ctx.fillStyle = flash ? '#FFE000' : '#FFA500'
    ctx.font = 'bold 13px Courier New'
    ctx.fillText(`⚡ RAPID FIRE ${Math.ceil(s.speedBoost / 1000)}s`, 200, 44)
    ctx.font = '16px Courier New'
    ctx.fillStyle = '#b8860b'
  }
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 52); ctx.lineTo(W, 52); ctx.stroke()

  // Player (factory)
  drawFactory(ctx, s.player.x, s.player.y, s.factorySkin)
  if (s.shields > 0) {
    ctx.strokeStyle = 'rgba(80,140,255,0.75)'
    ctx.lineWidth = 2
    ctx.strokeRect(s.player.x - 5, s.player.y - 20, PLAYER_W + 10, PLAYER_H + 24)
  }

  for (const b of s.bullets) drawTruck(ctx, b.x, b.y, true)
  for (const b of s.alienBullets) drawTruck(ctx, b.x, b.y, false)

  for (const p of s.powerUps) drawPowerUp(ctx, p.x, p.y, p.type)

  for (const a of s.aliens) {
    if (!a.alive) continue
    drawAlien(ctx, a.x, a.y, a.type, s.alienSkin)
  }

  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke()
}

function applyPowerUp(s, type) {
  if (type === 'speed') s.speedBoost = 5000
  else if (type === 'heart') s.lives = Math.min(s.lives + 1, 5)
}

function drawPowerUp(ctx, x, y, type) {
  const tick = Math.floor(Date.now() / 350) % 2
  const isHeart = type === 'heart'
  const col = isHeart ? (tick === 0 ? '#FF4466' : '#FF2244') : (tick === 0 ? '#FFE000' : '#FFA500')
  const cx = x + POWERUP_W / 2, cy = y + POWERUP_H / 2

  ctx.globalAlpha = 0.3
  ctx.fillStyle = col
  ctx.beginPath(); ctx.arc(cx, cy, POWERUP_W / 2 + 4, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = col
  ctx.beginPath(); ctx.arc(cx, cy, POWERUP_W / 2, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = isHeart ? '#1a0008' : '#1a1100'
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(isHeart ? '♥' : '⚡', cx, cy)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawFactory(ctx, px, py, skin = 'default') {
  if (skin === 'rocket') { drawRocket(ctx, px, py); return }
  if (skin === 'castle') { drawCastle(ctx, px, py); return }
  const tick = Math.floor(Date.now() / 500) % 2

  // Three smoke stacks
  ctx.fillStyle = '#445560'
  ctx.fillRect(px + 4,  py - 14, 6, 16)
  ctx.fillRect(px + 17, py - 10, 6, 12)
  ctx.fillRect(px + 30, py - 14, 6, 16)

  // Animated smoke puffs
  ctx.fillStyle = tick === 0 ? '#CCCCCC' : '#AAAAAA'
  ctx.beginPath(); ctx.arc(px + 7,  py - 18, 5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(px + 20, py - 14, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(px + 33, py - 18, 5, 0, Math.PI * 2); ctx.fill()

  // Main building body
  ctx.fillStyle = '#7788AA'
  ctx.fillRect(px, py, PLAYER_W, PLAYER_H)

  // Roof trim
  ctx.fillStyle = '#4A5A70'
  ctx.fillRect(px, py, PLAYER_W, 3)

  // Three glowing windows
  ctx.fillStyle = '#FFD966'
  ctx.fillRect(px + 3,  py + 5, 9, 12)
  ctx.fillRect(px + 15, py + 5, 10, 12)
  ctx.fillRect(px + 28, py + 5, 9, 12)

  // Window cross dividers
  ctx.fillStyle = '#4A5A70'
  ctx.fillRect(px + 7,  py + 5, 2, 12)
  ctx.fillRect(px + 3,  py + 10, 9, 2)
  ctx.fillRect(px + 19, py + 5, 2, 12)
  ctx.fillRect(px + 15, py + 10, 10, 2)
  ctx.fillRect(px + 32, py + 5, 2, 12)
  ctx.fillRect(px + 28, py + 10, 9, 2)
}

function drawTruck(ctx, bx, by, facingUp) {
  const cx = Math.round(bx + BULLET_W / 2)
  const cy = Math.round(by + BULLET_H / 2)
  const body = facingUp ? '#2266FF' : '#FF6600'
  const wheel = '#222'
  const win = '#001133'
  const light = facingUp ? '#FFFFAA' : '#FFDD00'

  if (facingUp) {
    ctx.fillStyle = body
    ctx.fillRect(cx - 3, cy - 7, 6, 4)   // cab
    ctx.fillRect(cx - 5, cy - 3, 10, 8)  // cargo
    ctx.fillStyle = win
    ctx.fillRect(cx - 2, cy - 6, 4, 2)   // windshield
    ctx.fillStyle = light
    ctx.fillRect(cx - 3, cy - 8, 2, 1)   // left headlight
    ctx.fillRect(cx + 1, cy - 8, 2, 1)   // right headlight
    ctx.fillStyle = wheel
    ctx.fillRect(cx - 7, cy + 2, 3, 4)   // left wheel
    ctx.fillRect(cx + 4, cy + 2, 3, 4)   // right wheel
  } else {
    ctx.fillStyle = body
    ctx.fillRect(cx - 5, cy - 5, 10, 8)  // cargo
    ctx.fillRect(cx - 3, cy + 3, 6, 4)   // cab
    ctx.fillStyle = win
    ctx.fillRect(cx - 2, cy + 4, 4, 2)   // windshield
    ctx.fillStyle = light
    ctx.fillRect(cx - 3, cy + 7, 2, 1)   // left headlight
    ctx.fillRect(cx + 1, cy + 7, 2, 1)   // right headlight
    ctx.fillStyle = wheel
    ctx.fillRect(cx - 7, cy - 6, 3, 4)   // left wheel
    ctx.fillRect(cx + 4, cy - 6, 3, 4)   // right wheel
  }
}

function drawAlien(ctx, x, y, type, skin = 'default') {
  if (skin === 'pixel') { drawPixelAlien(ctx, x, y, type); return }
  if (skin === 'ghost') { drawGhostAlien(ctx, x, y, type); return }
  const tick = Math.floor(Date.now() / 500) % 2
  ctx.save()
  ctx.translate(x + ALIEN_W / 2, y + ALIEN_H / 2 - 1)

  if (type === 2) {
    drawBanana(ctx, '#FFE135', '#A07000', '#5C3800', 10, tick)
    drawTopHat(ctx, -7)
  } else if (type === 1) {
    drawBanana(ctx, '#88C030', '#3A6810', '#163808', 6, tick)
    drawPartyHat(ctx, -6, tick)
  } else {
    drawBanana(ctx, '#E09018', '#784010', '#361800', 14, tick)
    ctx.fillStyle = '#5C2C08'
    ctx.fillRect(-5, -6, 3, 2)
    ctx.fillRect(1,  -4, 2, 2)
    ctx.fillRect(5,  -8, 2, 2)
    drawCowboyHat(ctx, -11)
  }

  ctx.restore()
}

function drawTopHat(ctx, topY) {
  ctx.fillStyle = '#111'
  ctx.fillRect(-9, topY - 2, 18, 3)      // brim
  ctx.fillRect(-6, topY - 12, 12, 10)    // crown
  ctx.fillStyle = '#CC1133'
  ctx.fillRect(-6, topY - 4, 12, 2)      // red band
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(-8, topY - 2, 16, 1)      // brim highlight
}

function drawPartyHat(ctx, topY, tick) {
  ctx.save()
  ctx.rotate(tick === 0 ? 0.1 : -0.1)   // wobble
  ctx.fillStyle = '#FF44CC'
  ctx.beginPath()
  ctx.moveTo(0, topY - 14)
  ctx.lineTo(-7, topY + 1)
  ctx.lineTo(7, topY + 1)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#FFEE00'
  ctx.fillRect(-3, topY - 10, 2, 2)
  ctx.fillRect(1,  topY - 6,  2, 2)
  ctx.fillStyle = '#00EEBB'
  ctx.fillRect(-2, topY - 3,  2, 2)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(0, topY - 14, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawCowboyHat(ctx, topY) {
  ctx.fillStyle = '#7A4520'
  ctx.fillRect(-13, topY - 1, 26, 4)     // wide brim
  ctx.fillRect(-6,  topY - 10, 12, 9)    // crown
  ctx.fillStyle = '#3A1808'
  ctx.fillRect(-6,  topY - 3, 12, 2)     // hatband
  ctx.fillStyle = '#5A3015'
  ctx.fillRect(-1,  topY - 10, 2, 3)     // crown dent
}

function drawBanana(ctx, fill, shade, tip, arch, tick) {
  ctx.save()
  ctx.rotate(-Math.PI / 2)   // 90° CW → vertical banana lies horizontal, curve on top

  const ht = 10, hw = 5
  const lean = arch * 0.4
  const tx = -lean * 0.5, ty = -(ht + 2)
  const bx =  lean * 0.5, by =  (ht + 2)
  const rc = hw + lean
  const lc = -hw + lean * 0.5

  // Body
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.bezierCurveTo(rc, ty * 0.35, rc, by * 0.35, bx, by)
  ctx.bezierCurveTo(lc, by * 0.35, lc, ty * 0.35, tx, ty)
  ctx.closePath()
  ctx.fill()

  // Edge shadows — darker on both sides, bright centre
  ctx.fillStyle = shade
  ctx.globalAlpha = 0.38
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.bezierCurveTo(lc,            ty * 0.35, lc,            by * 0.35, bx, by)
  ctx.bezierCurveTo(lc + hw * 0.7, by * 0.35, lc + hw * 0.7, ty * 0.35, tx, ty)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.bezierCurveTo(rc,            ty * 0.35, rc,            by * 0.35, bx, by)
  ctx.bezierCurveTo(rc - hw * 0.7, by * 0.35, rc - hw * 0.7, ty * 0.35, tx, ty)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  // Tips
  ctx.fillStyle = tip
  ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(bx, by, 2.0, 0, Math.PI * 2); ctx.fill()

  // Highlight shimmer
  ctx.strokeStyle = tick === 0 ? 'rgba(255,255,220,0.8)' : 'rgba(255,255,220,0.15)'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(lean * 0.5, ty + 3)
  ctx.bezierCurveTo(lean * 0.6, ty * 0.3, lean * 0.6, by * 0.3, lean * 0.5, by - 3)
  ctx.stroke()

  ctx.restore()
}

// ─── Factory skins ────────────────────────────────────────────────────────────

function drawRocket(ctx, px, py) {
  const cx = px + PLAYER_W / 2
  const tick = Math.floor(Date.now() / 120) % 3

  // Exhaust flame
  const flames = ['#FF5500', '#FF8800', '#FFCC00']
  ctx.fillStyle = flames[tick]
  ctx.beginPath()
  ctx.moveTo(cx - 6, py + PLAYER_H)
  ctx.lineTo(cx + 6, py + PLAYER_H)
  ctx.lineTo(cx, py + PLAYER_H + 8 + tick * 4)
  ctx.closePath()
  ctx.fill()

  // Side fins
  ctx.fillStyle = '#5577CC'
  ctx.beginPath()
  ctx.moveTo(cx - 8, py + 2); ctx.lineTo(cx - 18, py + PLAYER_H); ctx.lineTo(cx - 8, py + PLAYER_H)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 8, py + 2); ctx.lineTo(cx + 18, py + PLAYER_H); ctx.lineTo(cx + 8, py + PLAYER_H)
  ctx.closePath(); ctx.fill()

  // Main body
  ctx.fillStyle = '#CCDDF0'
  ctx.fillRect(cx - 8, py - 16, 16, PLAYER_H + 16)

  // Nose cone
  ctx.fillStyle = '#AABBDD'
  ctx.beginPath()
  ctx.moveTo(cx, py - 26); ctx.lineTo(cx - 8, py - 16); ctx.lineTo(cx + 8, py - 16)
  ctx.closePath(); ctx.fill()

  // Porthole
  ctx.fillStyle = '#4499FF'
  ctx.beginPath(); ctx.arc(cx, py - 2, 5, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#2266CC'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath(); ctx.arc(cx - 2, py - 4, 2, 0, Math.PI * 2); ctx.fill()
}

function drawCastle(ctx, px, py) {
  // Side walls
  ctx.fillStyle = '#778899'
  ctx.fillRect(px, py + 6, 4, PLAYER_H - 6)
  ctx.fillRect(px + PLAYER_W - 4, py + 6, 4, PLAYER_H - 6)

  // Main tower body
  ctx.fillStyle = '#889AAA'
  ctx.fillRect(px + 4, py, PLAYER_W - 8, PLAYER_H)

  // Battlements — 3 merlons
  ctx.fillStyle = '#778899'
  ctx.fillRect(px + 4,  py - 10, 8, 11)
  ctx.fillRect(px + 17, py - 10, 6, 11)
  ctx.fillRect(px + 28, py - 10, 8, 11)

  // Stone row lines
  ctx.strokeStyle = '#556677'; ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(px + 4, py + 7);  ctx.lineTo(px + PLAYER_W - 4, py + 7);  ctx.stroke()
  ctx.beginPath(); ctx.moveTo(px + 4, py + 14); ctx.lineTo(px + PLAYER_W - 4, py + 14); ctx.stroke()

  // Arrow slit (cross)
  const sx = px + PLAYER_W / 2
  ctx.fillStyle = '#1A2030'
  ctx.fillRect(sx - 1, py + 3, 2, 13)
  ctx.fillRect(sx - 4, py + 8, 8, 3)
}

// ─── Alien skins ─────────────────────────────────────────────────────────────

const PIXEL_DATA = {
  2: {
    color: '#FF55CC',
    top: [
      [0,1,0,0,0,0,0,1,0],
      [0,0,1,1,1,1,1,0,0],
      [1,0,1,0,0,0,1,0,1],
      [1,1,1,1,1,1,1,1,1],
    ],
    legs: [
      [[1,0,1,1,0,1,1,0,1],[0,1,0,0,0,0,0,1,0]],
      [[0,1,1,0,0,0,1,1,0],[1,0,0,0,0,0,0,0,1]],
    ],
  },
  1: {
    color: '#44EEFF',
    top: [
      [0,0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,1,1,0],
      [1,1,0,1,1,1,0,1,1],
      [1,1,1,1,1,1,1,1,1],
    ],
    legs: [
      [[0,1,0,1,0,1,0,1,0],[1,0,0,0,0,0,0,0,1]],
      [[1,0,1,0,1,0,1,0,1],[0,1,0,0,0,0,0,1,0]],
    ],
  },
  0: {
    color: '#44FF88',
    top: [
      [0,0,0,0,1,0,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,0,1,1,1,0,1,0],
      [1,1,1,1,1,1,1,1,1],
    ],
    legs: [
      [[0,1,1,0,1,0,1,1,0],[1,0,0,0,0,0,0,0,1]],
      [[1,0,0,1,0,1,0,0,1],[0,1,0,0,0,0,0,1,0]],
    ],
  },
}

function drawPixelAlien(ctx, x, y, type) {
  const { color, top, legs } = PIXEL_DATA[type]
  const tick = Math.floor(Date.now() / 500) % 2
  const rows = [...top, ...legs[tick]]
  const scale = 3
  const ox = x + Math.floor((ALIEN_W - 9 * scale) / 2)
  const oy = y + Math.floor((ALIEN_H - 6 * scale) / 2)
  ctx.fillStyle = color
  rows.forEach((row, r) => {
    row.forEach((on, c) => { if (on) ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale) })
  })
}

function drawGhostAlien(ctx, x, y, type) {
  const fills  = ['#FF6688', '#5599FF', '#FFAA33']
  const shades = ['#CC2244', '#2266CC', '#CC7700']
  const cx = x + ALIEN_W / 2
  const cy = y + ALIEN_H / 2 - 2
  const tick = Math.floor(Date.now() / 400) % 2

  // Body + dome
  ctx.fillStyle = fills[type]
  ctx.beginPath()
  ctx.arc(cx, cy, 12, Math.PI, 0)
  ctx.lineTo(cx + 12, cy + 10)
  const bump = tick === 0 ? 4 : 7
  ctx.quadraticCurveTo(cx + 8,  cy + bump, cx + 4,  cy + 10)
  ctx.quadraticCurveTo(cx,      cy + bump, cx - 4,  cy + 10)
  ctx.quadraticCurveTo(cx - 8,  cy + bump, cx - 12, cy + 10)
  ctx.closePath()
  ctx.fill()

  // Side shading
  ctx.fillStyle = shades[type]
  ctx.beginPath(); ctx.arc(cx + 4, cy - 1, 7, Math.PI * 1.3, Math.PI * 1.85); ctx.fill()

  // White eyes
  ctx.fillStyle = 'white'
  ctx.beginPath(); ctx.arc(cx - 4, cy - 1, 3.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4, cy - 1, 3.5, 0, Math.PI * 2); ctx.fill()

  // Pupils (shift left/right with tick)
  ctx.fillStyle = '#111'
  const ex = tick === 0 ? -1 : 1
  ctx.beginPath(); ctx.arc(cx - 4 + ex, cy - 1, 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4 + ex, cy - 1, 1.8, 0, Math.PI * 2); ctx.fill()
}
