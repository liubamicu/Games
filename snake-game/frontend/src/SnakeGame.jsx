import { useEffect, useRef, useCallback, useState } from 'react'
import './SnakeGame.css'

const CELL = 28        // px per grid cell
const BODY_COLORS = ['#22c55e', '#a855f7', '#ec4899', '#3b82f6', '#f97316']
const TICK_MS = 150

function lerp(a, b, t) { return a + (b - a) * t }

function interpolateSnake(snake, prev, t) {
  return snake.map((seg, i) => {
    const p = prev[i] || seg
    return [lerp(p[0], seg[0], t), lerp(p[1], seg[1], t)]
  })
}

function BananaTitle() {
  return (
    <div className="bubble-title">
      BONBON<br />THE BANANA SNAKE
    </div>
  )
}
// In dev the Python backend runs standalone on :8000; in the one-port build the WS is same-origin.
const WS_URL = import.meta.env.DEV
  ? 'ws://localhost:8000/ws'
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
const API = import.meta.env.DEV ? 'http://localhost:4000' : ''
const NAME_KEY = 'snake_name'

const KEY_MAP = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
}

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const gameStateRef = useRef(null)
  const animFrameRef = useRef(null)
  const bodyColorRef = useRef(BODY_COLORS[0])
  const prevScoreRef = useRef(0)
  const prevSnakeRef = useRef([])
  const lastTickTimeRef = useRef(0)
  const gameActiveRef = useRef(false)
  const [status, setStatus] = useState('connecting') // connecting | playing | dead | disconnected
  const [score, setScore] = useState(0)
  const [totalScore, setTotalScore] = useState(() => parseInt(localStorage.getItem('bonbon-total') || '0'))
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [nameInput, setNameInput] = useState('')
  const [board, setBoard] = useState(null)   // top-10 array | null while saving
  const [myRank, setMyRank] = useState(null)
  const [showBoard, setShowBoard] = useState(false)
  const playerNameRef = useRef(playerName)
  useEffect(() => { playerNameRef.current = playerName }, [playerName])

  const draw = useCallback((segs) => {
    const state = gameStateRef.current
    const canvas = canvasRef.current
    if (!canvas || !state) return

    const { food, grid_width, grid_height } = state
    const snake = segs || state.snake
    const ctx = canvas.getContext('2d')

    canvas.width  = grid_width  * CELL
    canvas.height = grid_height * CELL

    // Background
    ctx.fillStyle = '#facc15'
    ctx.fillRect(0, 0, canvas.width, canvas.height)


    // Grid lines
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= grid_width; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke()
    }
    for (let y = 0; y <= grid_height; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke()
    }

    // Banana — white circle backdrop so it pops off the yellow board
    const [fx, fy] = food
    const bcx = fx * CELL + CELL / 2
    const bcy = fy * CELL + CELL / 2
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(bcx, bcy, CELL / 2 - 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.font = `${CELL - 4}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'black'
    ctx.shadowBlur = 3
    ctx.fillText('🍌', bcx, bcy)
    ctx.shadowBlur = 0

    // Snake — connected body
    if (snake.length > 0) {
      const tracePath = () => {
        ctx.beginPath()
        snake.forEach(([x, y], i) => {
          const cx = x * CELL + CELL / 2
          const cy = y * CELL + CELL / 2
          i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
        })
      }
      const [hx, hy] = snake[0]
      const hcx = hx * CELL + CELL / 2
      const hcy = hy * CELL + CELL / 2
      const [tx, ty] = snake[snake.length - 1]
      const tcx = tx * CELL + CELL / 2
      const tcy = ty * CELL + CELL / 2
      const eyeDir = snake.length > 1
        ? [snake[0][0] - snake[1][0], snake[0][1] - snake[1][1]]
        : [1, 0]
      const [ex, ey] = eyeDir
      const perp = [-ey, ex]

      const grad = ctx.createLinearGradient(hcx, hcy, tcx, tcy)
      grad.addColorStop(0, '#facc15')
      grad.addColorStop(1, bodyColorRef.current)

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      // Rim
      tracePath()
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = CELL - 2
      ctx.stroke()
      // Gradient body
      tracePath()
      ctx.strokeStyle = grad
      ctx.lineWidth = CELL - 6
      ctx.stroke()

      // Tongue
      const tBase = { x: hcx + ex * (CELL / 2 - 2), y: hcy + ey * (CELL / 2 - 2) }
      const tTip  = { x: tBase.x + ex * 10,          y: tBase.y + ey * 10 }
      ctx.strokeStyle = '#ff2255'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(tBase.x, tBase.y); ctx.lineTo(tTip.x, tTip.y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(tTip.x, tTip.y)
      ctx.lineTo(tTip.x + ex * 5 - ey * 4, tTip.y + ey * 5 + ex * 4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(tTip.x, tTip.y)
      ctx.lineTo(tTip.x + ex * 5 + ey * 4, tTip.y + ey * 5 - ex * 4); ctx.stroke()

      // Eyes
      ctx.fillStyle = '#0a0a0f'
      ;[1, -1].forEach(side => {
        ctx.beginPath()
        ctx.arc(
          hcx + ex * 5 + perp[0] * 5 * side,
          hcy + ey * 5 + perp[1] * 5 * side,
          2.5, 0, Math.PI * 2
        )
        ctx.fill()
      })
    }
  }, [])

  const rafLoop = useCallback(() => {
    if (!gameActiveRef.current) return
    const state = gameStateRef.current
    if (state) {
      const rawT = Math.min(1, (Date.now() - lastTickTimeRef.current) / TICK_MS)
      const t = 1 - Math.pow(1 - rawT, 2)
      draw(interpolateSnake(state.snake, prevSnakeRef.current, t))
    }
    animFrameRef.current = requestAnimationFrame(rafLoop)
  }, [draw])

  const fetchBoard = useCallback(() => {
    fetch(`${API}/api/scores/snake`).then(r => r.json())
      .then(d => setBoard(Array.isArray(d) ? d : [])).catch(() => setBoard([]))
  }, [])

  const submitScore = useCallback((finalScore) => {
    fetch(`${API}/api/scores/snake`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerNameRef.current || 'Player', score: finalScore, detail: '' }),
    }).then(r => r.json())
      .then(d => { if (d && Array.isArray(d.top)) { setBoard(d.top); setMyRank(d.rank ?? null) } else fetchBoard() })
      .catch(() => fetchBoard())
  }, [fetchBoard])

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    setStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setStatus('playing')

    ws.onmessage = (e) => {
      const state = JSON.parse(e.data)
      prevSnakeRef.current = gameStateRef.current?.snake || []
      lastTickTimeRef.current = Date.now()
      gameStateRef.current = state
      if (state.score > prevScoreRef.current) {
        const idx = BODY_COLORS.indexOf(bodyColorRef.current)
        bodyColorRef.current = BODY_COLORS[(idx + 1) % BODY_COLORS.length]
      }
      const gained = state.score - prevScoreRef.current
      prevScoreRef.current = state.score
      setScore(state.score)
      if (gained > 0) {
        setTotalScore(t => {
          const next = t + gained
          localStorage.setItem('bonbon-total', next)
          return next
        })
      }
      if (state.game_over) {
        gameActiveRef.current = false
        setStatus('dead')
        setBoard(null); setMyRank(null)
        submitScore(state.score)
      } else if (!gameActiveRef.current) {
        gameActiveRef.current = true
        rafLoop()
      }
    }

    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')
  }, [draw, rafLoop, submitScore])

  useEffect(() => {
    if (!playerName) return        // wait until a name is entered before connecting
    connect()
    return () => {
      gameActiveRef.current = false
      wsRef.current?.close()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [connect, playerName])

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEY_MAP[e.key]
      if (dir) {
        e.preventDefault()
        wsRef.current?.send(JSON.stringify({ type: 'direction', value: dir }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const restart = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'restart' }))
      prevSnakeRef.current = []
      lastTickTimeRef.current = Date.now()
      gameActiveRef.current = true
      setStatus('playing')
      setScore(0)
      rafLoop()
    } else {
      connect()
    }
  }

  function confirmName() {
    const n = nameInput.trim().slice(0, 20)
    if (!n) return
    localStorage.setItem(NAME_KEY, n)
    setPlayerName(n)
  }

  function openBoard() { fetchBoard(); setShowBoard(true) }

  // First-time name gate — must enter a name before playing
  if (!playerName) {
    return (
      <div className="game-wrapper">
        <BananaTitle />
        <div style={sx.gateBox}>
          <p style={{ color: '#7a4f00', fontSize: '1rem', letterSpacing: '0.08em' }}>Enter your name to play</p>
          <input style={sx.input} maxLength={20} value={nameInput} placeholder="Your name" autoFocus
            onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmName()} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={sx.btn} onClick={confirmName}>START 🐍</button>
            <button style={sx.btnAlt} onClick={openBoard}>🏆 SCORES</button>
          </div>
        </div>
        {showBoard && <BoardModal board={board} highlight={playerName} onClose={() => setShowBoard(false)} />}
      </div>
    )
  }

  return (
    <div className="game-wrapper">
      <button style={sx.corner} title="High scores" onClick={openBoard}>🏆</button>
      <div className="hud">
        <span className="hud-label">SCORE <span className="hud-value">{score}</span></span>
        <BananaTitle />
        <span className="hud-label">TOTAL <span className="hud-value">{totalScore}</span></span>
      </div>

      <div className="canvas-container">
        <canvas ref={canvasRef} />

        {status === 'connecting' && (
          <div className="overlay">
            <p className="overlay-title">Connecting…</p>
            <p className="overlay-sub">Make sure the Python backend is running</p>
          </div>
        )}

        {status === 'dead' && (
          <div className="overlay">
            <p className="overlay-title">GAME OVER</p>
            <p className="overlay-sub">Score: {score}{myRank ? `  ·  Rank #${myRank}` : ''}</p>
            <ScoreList board={board} highlight={playerName} />
            <button className="btn" onClick={restart}>PLAY AGAIN</button>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="overlay">
            <p className="overlay-title">DISCONNECTED</p>
            <p className="overlay-sub">Backend not reachable — start it then retry</p>
            <button className="btn" onClick={connect}>RETRY</button>
          </div>
        )}
      </div>

      <p className="controls">
        Arrow keys or WASD to move &nbsp;·&nbsp;
        <button
          onClick={() => { setTotalScore(0); localStorage.removeItem('bonbon-total'); }}
          style={{ background: 'none', border: 'none', color: '#555', fontFamily: "'Courier New', monospace", fontSize: '0.72rem', letterSpacing: '0.12em', cursor: 'pointer', padding: 0 }}
        >RESET TOTAL</button>
      </p>

      {showBoard && <BoardModal board={board} highlight={playerName} onClose={() => setShowBoard(false)} />}
    </div>
  )
}

function ScoreList({ board, highlight }) {
  if (board === null) return <p className="overlay-sub">Saving…</p>
  if (!board.length) return <p className="overlay-sub">No scores yet — be first!</p>
  return (
    <table style={sx.table}><tbody>
      {board.map((s, i) => {
        const me = highlight && (s.name || '').toLowerCase() === highlight.toLowerCase()
        return (
          <tr key={i} style={me ? sx.meRow : null}>
            <td style={sx.tdRank}>{i + 1}</td>
            <td style={sx.tdName}>{s.name}{me ? ' ◄' : ''}</td>
            <td style={sx.tdScore}>{s.score}</td>
          </tr>
        )
      })}
    </tbody></table>
  )
}

function BoardModal({ board, highlight, onClose }) {
  return (
    <div style={sx.modalOverlay} onClick={onClose}>
      <div style={sx.modalBox} onClick={e => e.stopPropagation()}>
        <p style={sx.modalTitle}>🏆 HIGH SCORES</p>
        <ScoreList board={board} highlight={highlight} />
        <button className="btn" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  )
}

const sx = {
  gateBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '28px 36px', background: '#facc15', border: '3px solid #7a4f00', borderRadius: '12px' },
  input: { padding: '10px 14px', fontFamily: "'Courier New', monospace", fontSize: '1rem', border: '2px solid #7a4f00', borderRadius: '6px', background: '#fffef0', color: '#7a4f00', outline: 'none', textAlign: 'center' },
  btn: { padding: '10px 24px', background: '#22c55e', border: '2px solid #15803d', color: '#fff', fontFamily: "'Courier New', monospace", fontSize: '1rem', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '6px' },
  btnAlt: { padding: '10px 24px', background: 'transparent', border: '2px solid #7a4f00', color: '#7a4f00', fontFamily: "'Courier New', monospace", fontSize: '1rem', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '6px' },
  corner: { position: 'fixed', top: '12px', right: '12px', zIndex: 30, background: '#facc15', border: '2px solid #7a4f00', color: '#7a4f00', borderRadius: '8px', padding: '6px 12px', fontSize: '1.1rem', cursor: 'pointer' },
  table: { borderCollapse: 'collapse', margin: '4px 0 8px', color: '#fff', minWidth: '260px' },
  meRow: { background: 'rgba(255,255,255,0.20)' },
  tdRank: { padding: '3px 10px', textAlign: 'right', opacity: 0.85 },
  tdName: { padding: '3px 10px', textAlign: 'left', fontWeight: 'bold' },
  tdScore: { padding: '3px 10px', textAlign: 'right' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  modalBox: { background: '#ca8a04', border: '3px solid #7a4f00', borderRadius: '12px', padding: '24px 32px', textAlign: 'center' },
  modalTitle: { fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '0.2em', color: '#fff', marginBottom: '10px' },
}
