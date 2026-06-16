import { useEffect, useState } from 'react'

const API = import.meta.env.DEV ? 'http://localhost:4000' : ''

// board: array (render) | null (saving…) | undefined (fetch it ourselves, for the menu)
export default function Leaderboard({ onClose, onPlayAgain = null, highlight = '', banner = null, board }) {
  const [fetched, setFetched] = useState(undefined)

  useEffect(() => {
    if (board !== undefined) return // parent supplies the list (after-death flow)
    let alive = true
    fetch(`${API}/api/scores/banana`)
      .then(r => r.json())
      .then(d => { if (alive) setFetched(Array.isArray(d) ? d : []) })
      .catch(() => { if (alive) setFetched([]) })
    return () => { alive = false }
  }, [board])

  const list = board !== undefined ? board : fetched
  const loading = list === undefined || list === null

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🍌</div>
        <h2 style={styles.title}>HIGH SCORES</h2>

        {banner && (
          <div style={styles.banner}>
            {banner.rank
              ? <>You ranked <strong style={styles.gold}>#{banner.rank}</strong></>
              : <>Score saved</>}
            <span style={{ color: '#888' }}> &nbsp;·&nbsp; {banner.score} pts &nbsp;·&nbsp; Wave {banner.wave}</span>
          </div>
        )}

        {loading ? (
          <p style={styles.msg}>{banner ? 'Saving…' : 'Loading…'}</p>
        ) : list.length === 0 ? (
          <p style={styles.msg}>No scores yet. Be the first!</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Name</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Score</th>
                <th style={styles.th}>Wave</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => {
                const me = highlight && (s.name || '').toLowerCase() === highlight.toLowerCase()
                return (
                  <tr key={i} style={me ? styles.meRow : null}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={{ ...styles.td, ...(me ? styles.gold : {}) }}>{s.name}{me ? ' ◄' : ''}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#b8860b' }}>{s.score}</td>
                    <td style={styles.td}>{(s.detail || '').replace('Wave ', '')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.2rem' }}>
          {onPlayAgain && <button style={styles.btn} onClick={onPlayAgain}>PLAY AGAIN</button>}
          <button style={styles.btn} onClick={onClose}>{onPlayAgain ? 'MENU' : 'BACK'}</button>
        </div>
      </div>
    </div>
  )
}

const GOLD = '#b8860b'
const styles = {
  overlay: { position: 'fixed', inset: 0, background: '#fafad2', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  box: { border: `2px solid ${GOLD}`, background: '#fffef0', padding: '2rem 2.5rem', minWidth: 380, textAlign: 'center', fontFamily: 'Courier New' },
  title: { color: GOLD, fontSize: '1.7rem', letterSpacing: 4, marginBottom: '1rem' },
  banner: { color: GOLD, fontSize: '0.95rem', marginBottom: '1rem', padding: '0.5rem', border: `1px dashed ${GOLD}`, letterSpacing: 1 },
  gold: { color: GOLD, fontWeight: 'bold' },
  msg: { color: GOLD, margin: '1.5rem 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: GOLD, borderBottom: `1px solid ${GOLD}`, padding: '0.4rem 0.8rem', textAlign: 'left', letterSpacing: 2, fontSize: '0.85rem' },
  td: { color: '#7a6a30', padding: '0.35rem 0.8rem', textAlign: 'left' },
  meRow: { background: '#fff5cc' },
  btn: { background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '0.5rem 2rem', cursor: 'pointer', letterSpacing: 3, fontSize: '1rem', fontFamily: 'Courier New' },
}
