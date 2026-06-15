import React, { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { useTetris } from './hooks/useTetris';
import { COLS, ROWS, BLOCK } from './game/constants';
import './App.css';

const SHOP_ITEMS = [
  { id: 'banana_king',  emoji: '🍌', name: 'Banana King',     desc: 'Neon royalty',              price: 3,   rarity: 'common'    },
  { id: 'pixel_heart',  emoji: '❤️',  name: 'Pixel Heart',     desc: 'Arcade forever',            price: 5,   rarity: 'common'    },
  { id: 'retro_pad',    emoji: '🎮', name: 'Retro Pad',       desc: 'Old school cool',           price: 8,   rarity: 'common'    },
  { id: 'space_bug',    emoji: '👾', name: 'Space Bug',       desc: 'Haunts the leaderboard',    price: 10,  rarity: 'common'    },
  { id: 'zap_badge',    emoji: '⚡', name: 'Zap Badge',       desc: 'Fastest fingers alive',     price: 14,  rarity: 'uncommon'  },
  { id: 'bronze_cup',   emoji: '🏆', name: 'Bronze Cup',      desc: 'First podium finish',       price: 18,  rarity: 'uncommon'  },
  { id: 'skull_token',  emoji: '💀', name: 'Skull Token',     desc: 'Danger zone collector',     price: 22,  rarity: 'uncommon'  },
  { id: 'neon_diamond', emoji: '💎', name: 'Neon Diamond',    desc: 'Shines in the dark',        price: 28,  rarity: 'uncommon'  },
  { id: 'fire_streak',  emoji: '🔥', name: 'Fire Streak',     desc: "You're absolutely on fire", price: 35,  rarity: 'rare'      },
  { id: 'moon_rock',    emoji: '🌙', name: 'Moon Rock',       desc: 'Smuggled from orbit',       price: 44,  rarity: 'rare'      },
  { id: 'arcade_crown', emoji: '👑', name: 'Arcade Crown',    desc: 'King of the machines',      price: 55,  rarity: 'rare'      },
  { id: 'alien_boss',   emoji: '👽', name: 'Alien Boss',      desc: 'From another dimension',    price: 65,  rarity: 'epic'      },
  { id: 'rocket_ship',  emoji: '🚀', name: 'Rocket Ship',     desc: 'Blast off to level 99',     price: 80,  rarity: 'epic'      },
  { id: 'golden_7',     emoji: '7️⃣',  name: 'Lucky Seven',    desc: 'Jackpot in your pocket',    price: 95,  rarity: 'epic'      },
  { id: 'ultra_unicorn',emoji: '🦄', name: 'Ultra Unicorn',   desc: 'The rarest of them all',    price: 120, rarity: 'legendary' },
];

const W = COLS * BLOCK;
const H = ROWS * BLOCK;
const NEXT_SIZE = 4 * BLOCK;

const BANANAS = [
  { top: '4%',  left: '10%',  rot: '-20deg', size: '2.2rem', delay: '0.0s'  },
  { top: '8%',  left: '36%',  rot:  '15deg', size: '1.6rem', delay: '1.2s'  },
  { top: '3%',  left: '57%',  rot: '-35deg', size: '2.0rem', delay: '0.4s'  },
  { top: '9%',  left: '82%',  rot:  '25deg', size: '1.9rem', delay: '0.8s'  },
  { top: '16%', left: '5%',   rot:  '45deg', size: '1.7rem', delay: '2.1s'  },
  { top: '28%', left: '2%',   rot:  '-8deg', size: '2.0rem', delay: '1.6s'  },
  { top: '50%', left: '7%',   rot:  '38deg', size: '1.5rem', delay: '0.6s'  },
  { top: '68%', left: '13%',  rot: '-28deg', size: '2.2rem', delay: '2.3s'  },
  { top: '20%', left: '90%',  rot:  '12deg', size: '1.8rem', delay: '0.3s'  },
  { top: '38%', left: '93%',  rot: '-42deg', size: '2.1rem', delay: '1.9s'  },
  { top: '58%', left: '88%',  rot:  '22deg', size: '1.6rem', delay: '1.0s'  },
  { top: '72%', left: '76%',  rot: '-18deg', size: '2.3rem', delay: '0.7s'  },
  { top: '78%', left: '28%',  rot: '-12deg', size: '1.8rem', delay: '0.5s'  },
  { top: '83%', left: '52%',  rot:  '33deg', size: '1.5rem', delay: '1.4s'  },
  { top: '76%', left: '68%',  rot: '-27deg', size: '2.0rem', delay: '2.0s'  },
  { top: '22%', left: '22%',  rot:  '52deg', size: '1.6rem', delay: '1.8s'  },
  { top: '42%', left: '77%',  rot: '-14deg', size: '1.7rem', delay: '0.9s'  },
  { top: '60%', left: '48%',  rot:  '60deg', size: '1.4rem', delay: '1.1s'  },
];

function drawBlock(ctx, col, row, color) {
  const x = col * BLOCK;
  const y = row * BLOCK;

  // Wide outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);

  // Tight inner glow (second pass brightens the core)
  ctx.shadowBlur = 7;
  ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
  ctx.shadowBlur = 0;

  // Top-left highlight edge
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x + 1, y + 1, BLOCK - 2, 3);
  ctx.fillRect(x + 1, y + 1, 3, BLOCK - 2);

  // Bottom-right shadow edge
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 1, y + BLOCK - 4, BLOCK - 2, 3);
  ctx.fillRect(x + BLOCK - 4, y + 1, 3, BLOCK - 2);

  // Bright LED hotspot in the centre
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + 5, y + 5, BLOCK - 10, BLOCK - 10);
}

export default function App() {
  const game = useTetris();
  const boardRef   = useRef(null);
  const nextRef    = useRef(null);
  const [shopOpen,    setShopOpen]    = useState(false);
  const [bananaTime,  setBananaTime]  = useState(false);
  const [cheatToast,  setCheatToast]  = useState(false);
  const cheatBuf = useRef('');
  const CHEAT = 'BANANA';

  const triggerBanana = useCallback(() => {
    setBananaTime(true);
    setTimeout(() => setBananaTime(false), 5000);
  }, []);

  // Cheat-code listener — type BANANA any time for +10 coins
  useEffect(() => {
    const onKey = (e) => {
      cheatBuf.current = (cheatBuf.current + e.key.toUpperCase()).slice(-CHEAT.length);
      if (cheatBuf.current === CHEAT) {
        game.cheatCoins();
        setCheatToast(true);
        cheatBuf.current = '';
        setTimeout(() => setCheatToast(false), 2200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.cheatCoins]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') setShopOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useLayoutEffect(() => {
    const ctx = boardRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (game.board[r][c]) drawBlock(ctx, c, r, game.board[r][c]);

    if (game.running && game.piece) {
      const { piece, ghost } = game;

      if (ghost !== null) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        for (let r = 0; r < piece.shape.length; r++)
          for (let c = 0; c < piece.shape[r].length; c++)
            if (piece.shape[r][c]) {
              const gx = piece.x + c, gy = ghost + r;
              if (gy >= 0) {
                ctx.fillStyle = piece.color;
                ctx.fillRect(gx * BLOCK, gy * BLOCK, BLOCK, BLOCK);
                ctx.strokeStyle = piece.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(gx * BLOCK + 1, gy * BLOCK + 1, BLOCK - 2, BLOCK - 2);
              }
            }
        ctx.restore();
      }

      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          if (piece.shape[r][c]) {
            const px = piece.x + c, py = piece.y + r;
            if (py >= 0) drawBlock(ctx, px, py, piece.color);
          }
    }

    if (!game.running || game.over || game.paused) {
      ctx.fillStyle = 'rgba(7,7,26,0.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';

      if (game.over) {
        ctx.fillStyle = '#ff1744';
        ctx.font = `bold ${BLOCK}px "Orbitron", monospace`;
        ctx.fillText('GAME OVER', W / 2, H / 2 - BLOCK * 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${BLOCK * 0.55}px "Orbitron", monospace`;
        ctx.fillText(`${game.score.toLocaleString()} pts`, W / 2, H / 2 - BLOCK * 0.9);
        // coin count
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${BLOCK * 0.52}px "Orbitron", monospace`;
        ctx.fillText(`🪙 ${game.coins} coins`, W / 2, H / 2 + BLOCK * 0.3);
        if (game.coins > 0) {
          ctx.fillStyle = '#aaaacc';
          ctx.font = `${BLOCK * 0.40}px monospace`;
          ctx.fillText('INSERT 1 COIN  [ SPACE ]', W / 2, H / 2 + BLOCK * 1.35);
        } else {
          ctx.fillStyle = '#ff4444';
          ctx.font = `bold ${BLOCK * 0.50}px "Orbitron", monospace`;
          ctx.fillText('NO COINS LEFT', W / 2, H / 2 + BLOCK * 1.35);
        }
      } else if (game.paused) {
        ctx.fillStyle = '#d500f9';
        ctx.font = `bold ${BLOCK}px "Orbitron", monospace`;
        ctx.fillText('PAUSED', W / 2, H / 2 - BLOCK * 0.3);
        ctx.fillStyle = '#aaaacc';
        ctx.font = `${BLOCK * 0.42}px monospace`;
        ctx.fillText('P  to resume', W / 2, H / 2 + BLOCK * 1.1);
      } else {
        // ── Start screen banana logo ──────────────────────────
        const cy = H / 2;

        // Flanking banana emojis
        ctx.font = `${BLOCK * 1.3}px serif`;
        ctx.shadowBlur = 0;
        ctx.fillText('🍌', W / 2 - BLOCK * 2.6, cy - BLOCK * 2.55);
        ctx.fillText('🍌', W / 2 + BLOCK * 1.3, cy - BLOCK * 2.55);

        // "S H P" label above
        ctx.fillStyle = '#ffe566';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 16;
        ctx.font = `bold ${BLOCK * 0.52}px "Orbitron", monospace`;
        ctx.fillText('S  H  P', W / 2, cy - BLOCK * 2.75);

        // "TETRIS" main title
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 32;
        ctx.font = `bold ${BLOCK * 1.15}px "Orbitron", monospace`;
        ctx.fillText('TETRIS', W / 2, cy - BLOCK * 1.55);

        // thin banana-coloured underline
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffcc0066';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(W * 0.18, cy - BLOCK * 1.15);
        ctx.lineTo(W * 0.82, cy - BLOCK * 1.15);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // coin wallet
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${BLOCK * 0.62}px "Orbitron", monospace`;
        ctx.fillText(`🪙 ${game.coins} coins`, W / 2, cy - BLOCK * 0.55);
        if (game.coins > 0) {
          ctx.fillStyle = '#ccccee';
          ctx.font = `${BLOCK * 0.46}px monospace`;
          ctx.fillText('INSERT 1 COIN', W / 2, cy + BLOCK * 0.55);
          ctx.fillStyle = '#666888';
          ctx.font = `${BLOCK * 0.34}px monospace`;
          ctx.fillText('+5@600pts  +10@1000pts  +20@2000pts', W / 2, cy + BLOCK * 1.2);
        } else {
          ctx.fillStyle = '#ff4444';
          ctx.font = `bold ${BLOCK * 0.58}px "Orbitron", monospace`;
          ctx.fillText('OUT OF COINS!', W / 2, cy + BLOCK * 0.6);
        }
      }
    }
  });

  useLayoutEffect(() => {
    const ctx = nextRef.current?.getContext('2d');
    if (!ctx || !game.next) return;
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
    const { shape, color } = game.next;
    const ox = Math.floor((4 - shape[0].length) / 2);
    const oy = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) drawBlock(ctx, ox + c, oy + r, color);
  });

  return (
    <div className="app" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/image-1779356314998.webp)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>

      {/* ── Neon bananas ───────────────────────────────────── */}
      {BANANAS.map((b, i) => (
        <span key={i} className="neon-banana"
          style={{ top: b.top, left: b.left, fontSize: b.size, '--rot': b.rot, animationDelay: b.delay }}>
          🍌
        </span>
      ))}

      {/* ── SHOP neon sign ─────────────────────────────────── */}
      <button className="shop-sign" onClick={() => setShopOpen(true)}>
        <span className="shop-sign-icon">🛒</span>
        <span className="shop-sign-text">SHOP</span>
      </button>

      {/* ── Game ───────────────────────────────────────────── */}
      <div className="game-wrap">

        {/* ── Left logo panel ──────────────────────────────── */}
        <div className="left-logo">
          <div className="ll-corner">
            <span>◤</span><span>◥</span>
          </div>

          <div className="ll-banana" onClick={triggerBanana} title="">🍌</div>

          <div className="ll-shp">S H P</div>
          <div className="ll-tetris">TETRIS</div>

          <div className="ll-divider" />

          {/* Mini stacked tetromino preview */}
          <div className="ll-blocks">
            {[
              ['#00e5ff','#00e5ff','#00e5ff','#00e5ff'],
              [null,     '#d500f9',null,      null     ],
              ['#d500f9','#d500f9','#ffea00','#ffea00' ],
              [null,     null,     '#ffea00','#ffea00' ],
            ].map((row, r) => row.map((col, c) =>
              col
                ? <div key={`${r}-${c}`} className="ll-block"
                    style={{ background: col, boxShadow: `0 0 6px ${col}aa` }} />
                : <div key={`${r}-${c}`} className="ll-block-empty" />
            ))}
          </div>

          <div className="ll-divider" />
          <div className="ll-arcade">ARCADE&nbsp;EDITION</div>

          <div className="ll-corner">
            <span>◣</span><span>◢</span>
          </div>
        </div>

        {/* Board + controls bar stacked in a column */}
        <div className="board-section">
          <canvas ref={boardRef} width={W} height={H} className="board" />

          {/* Controls bar — same width as the board */}
          <div className="controls-bar">
            <CtrlKey k="← →"   desc="Move"      />
            <div className="ctrl-sep" />
            <CtrlKey k="↑"     desc="Rotate"    />
            <div className="ctrl-sep" />
            <CtrlKey k="↓"     desc="Soft drop" />
            <div className="ctrl-sep" />
            <CtrlKey k="SPACE" desc="Hard drop" />
            <div className="ctrl-sep" />
            <CtrlKey k="P"     desc="Pause"     />
          </div>
        </div>

        <aside className="panel">
          <div className="logo">
            <span className="logo-bananas">🍌 🍌 🍌</span>
            <span className="logo-shp">S H P</span>
            <span className="logo-tetris">TETRIS</span>
          </div>
          <div className="box coin-box">
            <div className="label">COINS</div>
            <div className="coin-value">🪙 {game.coins}</div>
            <div className="coin-rate">+5@600 · +10@1k · +20@2k</div>
          </div>
          <Stat label="SCORE" value={game.score.toLocaleString()} />
          <Stat label="LEVEL" value={game.level} />
          <Stat label="LINES" value={game.lines} />
          <div className="box">
            <div className="label">NEXT</div>
            <canvas ref={nextRef} width={NEXT_SIZE} height={NEXT_SIZE} className="next-canvas" />
          </div>
          {game.inventory.length > 0 && (
            <div className="box">
              <div className="label">COLLECTION {game.inventory.length}/{SHOP_ITEMS.length}</div>
              <div className="collection-grid">
                {game.inventory.map(id => {
                  const item = SHOP_ITEMS.find(i => i.id === id);
                  return <span key={id} className="col-item" title={item?.name}>{item?.emoji}</span>;
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Secret dancing banana overlay ─────────────────── */}
      {bananaTime && (
        <div className="bd-overlay">
          <div className="bd-disco" />
          <div className="bd-banana-char">
            <span className="bd-banana-emoji">🍌</span>
            {/* Face overlaid at the banana's wide middle section */}
            <div className="bd-face">
              <div className="bd-eyes-row">
                <div className="bd-eye"><div className="bd-pupil" /></div>
                <div className="bd-eye"><div className="bd-pupil" /></div>
              </div>
              <div className="bd-cheeks">
                <div className="bd-cheek" />
                <div className="bd-cheek" />
              </div>
              <div className="bd-mouth" />
            </div>
          </div>
          <div className="bd-text">🍌 BANANA TIME! 🍌</div>
          <div className="bd-bar"><div className="bd-bar-fill" /></div>
        </div>
      )}

      {/* ── Cheat code toast ───────────────────────────────── */}
      {cheatToast && (
        <div className="cheat-toast">
          🍌 +10 COINS 🍌
          <span className="cheat-sub">CHEAT CODE!</span>
        </div>
      )}

      {/* ── Shop modal ─────────────────────────────────────── */}
      {shopOpen && (
        <div className="shop-overlay" onClick={() => setShopOpen(false)}>
          <div className="shop-modal" onClick={e => e.stopPropagation()}>
            <div className="shop-header">
              <span className="shop-title">🕹 ARCADE SHOP</span>
              <span className="shop-wallet">🪙 {game.coins} coins</span>
              <button className="shop-close" onClick={() => setShopOpen(false)}>✕</button>
            </div>
            <div className="shop-grid">
              {SHOP_ITEMS.map(item => {
                const owned     = game.inventory.includes(item.id);
                const canAfford = game.coins >= item.price;
                return (
                  <div key={item.id} className={`shop-item rarity-${item.rarity} ${owned ? 'owned' : ''} ${!canAfford && !owned ? 'broke' : ''}`}>
                    <div className="item-emoji">{item.emoji}</div>
                    <div className="item-name">{item.name}</div>
                    <div className="item-desc">{item.desc}</div>
                    <div className={`item-rarity ${item.rarity}`}>{item.rarity.toUpperCase()}</div>
                    {owned
                      ? <div className="item-owned">✔ OWNED</div>
                      : <button className="item-buy" disabled={!canAfford}
                          onClick={() => game.buyItem(item.id, item.price)}>
                          🪙 {item.price}
                        </button>
                    }
                  </div>
                );
              })}
            </div>
            <div className="shop-footer">ESC or click outside to close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="box">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function Key({ k, desc }) {
  return (
    <div className="key-row">
      <span className="key">{k}</span>
      <span className="key-desc">{desc}</span>
    </div>
  );
}

function CtrlKey({ k, desc }) {
  return (
    <div className="ctrl-item">
      <span className="ctrl-key">{k}</span>
      <span className="ctrl-desc">{desc}</span>
    </div>
  );
}

