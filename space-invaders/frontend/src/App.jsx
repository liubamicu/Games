import { useState, useCallback } from 'react'
import Game from './Game.jsx'
import Shop from './Shop.jsx'
import Leaderboard from './Leaderboard.jsx'

const API = import.meta.env.DEV ? 'http://localhost:4000' : ''
const NAME_KEY = 'banana_name'

const DEFAULT_UPGRADES = { cooldownReduction: 0, shields: 0, speedBonus: 0, factorySkin: 'default', alienSkin: 'default' }

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [gameKey, setGameKey] = useState(0)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [nameInput, setNameInput] = useState('')
  const [gameProgress, setGameProgress] = useState({ wave: 1, score: 0, lives: 3, points: 0 })
  const [upgrades, setUpgrades] = useState(DEFAULT_UPGRADES)
  const [result, setResult] = useState(null) // { score, wave, rank } after a death

  function startFresh() {
    setGameProgress({ wave: 1, score: 0, lives: 3, points: 0 })
    setUpgrades(DEFAULT_UPGRADES)
    setGameKey(k => k + 1)
  }

  function play() {
    if (!playerName) { setNameInput(''); setScreen('enterName'); return }
    startFresh(); setResult(null); setScreen('game')
  }

  function confirmName() {
    const n = nameInput.trim().slice(0, 20)
    if (!n) return
    localStorage.setItem(NAME_KEY, n)
    setPlayerName(n)
    startFresh(); setResult(null); setScreen('game')
  }

  async function submitScore(score, wave) {
    try {
      const r = await fetch(`${API}/api/scores/banana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName || 'Player', score, detail: `Wave ${wave}` }),
      })
      return await r.json()
    } catch { return null }
  }

  const handleGameOver = useCallback((action, score, wave, lives, points) => {
    if (action === 'dead') {
      // Switch to the board immediately (so the dead game can't be clicked), submit in the background.
      setResult({ score, wave, rank: null, board: null })
      setScreen('leaderboard')
      submitScore(score, wave).then(data => {
        if (data && Array.isArray(data.top)) {
          setResult(r => r && { ...r, rank: data.rank ?? null, board: data.top })
        } else {
          fetch(`${API}/api/scores/banana`).then(r => r.json())
            .then(d => setResult(r => r && { ...r, board: Array.isArray(d) ? d : [] }))
            .catch(() => setResult(r => r && { ...r, board: [] }))
        }
      })
    } else if (action === 'restart') {
      startFresh(); setResult(null); setScreen('game')
    } else if (action === 'menu') {
      startFresh(); setScreen('menu')
    } else if (action === 'waveCleared') {
      setGameProgress({ wave, score, lives, points })
      setScreen('shop')
    }
  }, [playerName]) // eslint-disable-line react-hooks/exhaustive-deps

  if (screen === 'enterName') return (
    <div style={styles.center}>
      <div style={styles.box}>
        <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🍌</div>
        <h2 style={styles.title}>ENTER YOUR NAME</h2>
        <p style={{ color: '#888', marginBottom: '1rem', fontSize: '0.85rem', letterSpacing: 1 }}>You'll appear on the high-score board</p>
        <input
          style={styles.input}
          placeholder="Your name"
          maxLength={20}
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmName()}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
          <button style={styles.btn} onClick={confirmName}>START 🍌</button>
          <button style={styles.btn} onClick={() => setScreen('menu')}>BACK</button>
        </div>
      </div>
    </div>
  )

  if (screen === 'leaderboard') return (
    <Leaderboard
      highlight={playerName}
      banner={result ? { score: result.score, wave: result.wave, rank: result.rank } : null}
      board={result ? result.board : undefined}
      onPlayAgain={result ? () => { startFresh(); setResult(null); setScreen('game') } : null}
      onClose={() => { setResult(null); setScreen('menu') }}
    />
  )

  if (screen === 'shop') return (
    <Shop
      wave={gameProgress.wave}
      score={gameProgress.score}
      initialPoints={gameProgress.points}
      initialLives={gameProgress.lives}
      upgrades={upgrades}
      onFinish={(finalPoints, finalLives, finalUpgrades) => {
        setGameProgress(g => ({ ...g, points: finalPoints, lives: finalLives }))
        setUpgrades(finalUpgrades)
        setGameKey(k => k + 1)
        setScreen('game')
      }}
    />
  )

  if (screen === 'game') return (
    <div style={styles.center}>
      <Game
        key={gameKey}
        onGameOver={handleGameOver}
        initialWave={gameProgress.wave}
        initialScore={gameProgress.score}
        initialPoints={gameProgress.points}
        initialLives={gameProgress.lives}
        upgrades={upgrades}
      />
      <p style={styles.hint}>Arrow keys / WASD to move &nbsp;|&nbsp; Space / Up to shoot</p>
    </div>
  )

  return (
    <div style={styles.center}>
      <div style={styles.box}>
        <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>🍌🍌🍌🍌🍌🍌🍌</div>
        <h1 style={{ ...styles.title, fontSize: '3rem', letterSpacing: 8 }}>BANANA INVADERS</h1>
        <p style={{ color: '#888', marginBottom: '2rem', letterSpacing: 2 }}>🍌 PEEL OR BE PEELED 🍌</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
          <button style={styles.btnLg} onClick={play}>PLAY</button>
          <button style={styles.btnLg} onClick={() => { setResult(null); setScreen('leaderboard') }}>🏆 HIGH SCORES</button>
        </div>
        {playerName && (
          <p style={styles.nameLine}>
            Player: <strong style={{ color: '#b8860b' }}>{playerName}</strong>
            <button style={styles.link} onClick={() => { setNameInput(playerName); setScreen('enterName') }}>change</button>
          </p>
        )}
        <div style={{ marginTop: '1.5rem', color: '#555', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <p>Arrow keys / WASD — move</p>
          <p>Space / Up arrow — shoot</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' },
  box: { border: '2px solid #b8860b', padding: '3rem 4rem', textAlign: 'center' },
  title: { color: '#b8860b', letterSpacing: 4, marginBottom: '0.5rem' },
  sub: { color: '#b8860b', margin: '0.3rem 0' },
  hint: { color: '#555', fontSize: '0.85rem', letterSpacing: 1 },
  input: { background: '#fafad2', border: '1px solid #b8860b', color: '#b8860b', padding: '0.5rem 1rem', fontSize: '1rem', width: '100%', marginTop: '1rem', outline: 'none', fontFamily: 'Courier New' },
  btn: { background: 'transparent', border: '1px solid #b8860b', color: '#b8860b', padding: '0.5rem 1.5rem', cursor: 'pointer', letterSpacing: 2, fontSize: '1rem' },
  btnLg: { background: 'transparent', border: '1px solid #b8860b', color: '#b8860b', padding: '0.8rem 3rem', cursor: 'pointer', letterSpacing: 4, fontSize: '1.1rem', width: '260px' },
  nameLine: { color: '#888', fontSize: '0.85rem', marginTop: '1.2rem', letterSpacing: 1 },
  link: { background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Courier New', fontSize: '0.8rem', marginLeft: '0.5rem' },
}
