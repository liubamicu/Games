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
const WS_URL = 'ws://localhost:8000/ws'

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
      } else if (!gameActiveRef.current) {
        gameActiveRef.current = true
        rafLoop()
      }
    }

    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')
  }, [draw, rafLoop])

  useEffect(() => {
    connect()
    return () => {
      gameActiveRef.current = false
      wsRef.current?.close()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [connect])

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

  return (
    <div className="game-wrapper">
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
            <p className="overlay-sub">Score: {score}</p>
            <p className="overlay-sub">Total: {totalScore}</p>
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
    </div>
  )
}
