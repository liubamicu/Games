export default function Leaderboard({ onClose }) {
  const raw = localStorage.getItem('si_scores')
  const scores = raw ? JSON.parse(raw) : []

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h2 style={styles.title}>HIGH SCORES</h2>
        {scores.length === 0 ? (
          <p style={styles.msg}>No scores yet. Be the first!</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Wave</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={i}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>{s.name}</td>
                  <td style={{ ...styles.td, color: '#b8860b' }}>{s.score}</td>
                  <td style={styles.td}>{s.wave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button style={styles.btn} onClick={onClose}>BACK</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  box: { border: '2px solid #b8860b', padding: '2rem', minWidth: 340, textAlign: 'center' },
  title: { color: '#b8860b', fontSize: '1.6rem', letterSpacing: 4, marginBottom: '1.5rem' },
  msg: { color: '#b8860b', margin: '1rem 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' },
  th: { color: '#b8860b', borderBottom: '1px solid #b8860b', padding: '0.4rem 0.8rem', textAlign: 'left', letterSpacing: 2 },
  td: { color: '#aaa', padding: '0.35rem 0.8rem', textAlign: 'left' },
  btn: { background: 'transparent', border: '1px solid #b8860b', color: '#b8860b', padding: '0.5rem 2rem', cursor: 'pointer', letterSpacing: 3, fontSize: '1rem' },
}
