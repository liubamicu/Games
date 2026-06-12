import { useState, useCallback } from 'react'
import Game from './Game.jsx'
import Shop from './Shop.jsx'
import Leaderboard from './Leaderboard.jsx'

function saveScore(name, score, wave) {
  const raw = localStorage.getItem('si_scores')
  const scores = raw ? JSON.parse(raw) : []
  scores.push({ name: (name.trim() || 'Anonymous').slice(0, 20), score, wave })
  scores.sort((a, b) => b.score - a.score)
  localStorage.setItem('si_scores', JSON.stringify(scores.slice(0, 10)))
}

const DEFAULT_UPGRADES = { cooldownReduction: 0, shields: 0, speedBonus: 0, factorySkin: 'default', alienSkin: 'default' }

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [gameKey, setGameKey] = useState(0)
  const [pendingScore, setPendingScore] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [gameProgress, setGameProgress] = useState({ wave: 1, score: 0, lives: 3, points: 0 })
  const [upgrades, setUpgrades] = useState(DEFAULT_UPGRADES)

  const handleGameOver = useCallback((action, score, wave, lives, points) => {
    if (action === 'restart') {
      setGameProgress({ wave: 1, score: 0, lives: 3, points: 0 })
      setUpgrades(DEFAULT_UPGRADES)
      setGameKey(k => k + 1)
    } else if (action === 'submit') {
      setPendingScore({ score, wave })
      setScreen('submit')
    } else if (action === 'menu') {
      setGameProgress({ wave: 1, score: 0, lives: 3, points: 0 })
      setUpgrades(DEFAULT_UPGRADES)
      setGameKey(k => k + 1)
      setScreen('menu')
    } else if (action === 'waveCleared') {
      setGameProgress({ wave, score, lives, points })
      setScreen('shop')
    }
  }, [])

  function submitScore() {
    saveScore(playerName, pendingScore.score, pendingScore.wave)
    setPendingScore(null)
    setScreen('leaderboard')
  }

  if (screen === 'leaderboard') return <Leaderboard onClose={() => setScreen('menu')} />

  if (screen === 'submit') return (
    <div style={styles.center}>
      <div style={styles.box}>
        <h2 style={styles.title}>🍌 GAME OVER 🍌</h2>
        <p style={styles.sub}>Final Score: <span style={{ color: '#b8860b' }}>{pendingScore?.score}</span></p>
        <p style={styles.sub}>Wave reached: {pendingScore?.wave}</p>
        <input
          style={styles.input}
          placeholder="Enter your name"
          maxLength={20}
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitScore()}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button style={styles.btn} onClick={submitScore}>SAVE SCORE</button>
          <button style={styles.btn} onClick={() => { setPendingScore(null); setGameKey(k => k + 1); setScreen('game') }}>SKIP</button>
        </div>
      </div>
    </div>
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
          <button style={styles.btnLg} onClick={() => setScreen('game')}>PLAY</button>
          <button style={styles.btnLg} onClick={() => setScreen('leaderboard')}>HIGH SCORES</button>
        </div>
        <div style={{ marginTop: '2rem', color: '#555', fontSize: '0.85rem', lineHeight: 1.8 }}>
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
  btnLg: { background: 'transparent', border: '1px solid #b8860b', color: '#b8860b', padding: '0.8rem 3rem', cursor: 'pointer', letterSpacing: 4, fontSize: '1.1rem', width: '220px' },
}
