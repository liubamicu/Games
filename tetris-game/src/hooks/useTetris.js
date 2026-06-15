import { useState, useEffect, useCallback, useRef } from 'react';
import {
  emptyBoard, spawnPiece, collides, merge, sweep, ghostRow, rotateCW,
} from '../game/logic';
import { SCORES_PER_LINE, SPEEDS } from '../game/constants';

const COIN_COST   = 1;
const START_COINS = 20;

// Tiered milestone rewards — every N points crossed awards R coins
const MILESTONES = [
  { every: 600,   reward: 5  },
  { every: 1000,  reward: 10 },
  { every: 2000,  reward: 20 },
  { every: 5000,  reward: 50 },
];

const coinDelta = (prev, next) => {
  let coins = 0;
  for (const { every, reward } of MILESTONES)
    coins += (Math.floor(next / every) - Math.floor(prev / every)) * reward;
  return coins;
};

const initialState = () => ({
  board: emptyBoard(),
  piece: spawnPiece(),
  next: spawnPiece(),
  score: 0,
  lines: 0,
  level: 0,
  over: false,
  paused: false,
  running: false,
  coins: START_COINS,
  inventory: [],
});

const lockPiece = (s) => {
  const merged = merge(s.board, s.piece);
  const { board, cleared } = sweep(merged);
  const lines  = s.lines + cleared;
  const level  = Math.floor(lines / 10);
  const score  = s.score + (cleared ? SCORES_PER_LINE[cleared] * (level + 1) : 0);
  const coins  = s.coins + coinDelta(s.score, score);
  const piece  = s.next;
  const next   = spawnPiece();
  if (collides(board, piece))
    return { ...s, board, score, lines, level, coins, over: true };
  return { ...s, board, piece, next, score, lines, level, coins };
};

export const useTetris = () => {
  const [gs, setGs] = useState(initialState);
  const gsRef = useRef(gs);
  gsRef.current = gs;

  const tick = useCallback(() => {
    setGs(s => {
      if (s.over || s.paused || !s.running) return s;
      const moved = { ...s.piece, y: s.piece.y + 1 };
      if (collides(s.board, moved)) return lockPiece(s);
      return { ...s, piece: moved };
    });
  }, []);

  useEffect(() => {
    if (gs.over || gs.paused || !gs.running) return;
    const speed = SPEEDS[Math.min(gs.level, SPEEDS.length - 1)];
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [gs.over, gs.paused, gs.running, gs.level, tick]);

  const start = useCallback(() => setGs(prev => {
    if (prev.coins < COIN_COST) return prev;
    return {
      ...initialState(),
      coins: prev.coins - COIN_COST,
      inventory: prev.inventory,   // persist collection across games
      running: true,
    };
  }), []);

  const buyItem = useCallback((id, price) => setGs(s => {
    if (s.coins < price || s.inventory.includes(id)) return s;
    return { ...s, coins: s.coins - price, inventory: [...s.inventory, id] };
  }), []);

  const cheatCoins = useCallback(() =>
    setGs(s => ({ ...s, coins: s.coins + 10 })), []);

  const left = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over || s.paused) return s;
      const p = { ...s.piece, x: s.piece.x - 1 };
      return collides(s.board, p) ? s : { ...s, piece: p };
    }), []);

  const right = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over || s.paused) return s;
      const p = { ...s.piece, x: s.piece.x + 1 };
      return collides(s.board, p) ? s : { ...s, piece: p };
    }), []);

  const rotate = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over || s.paused) return s;
      const rotated = rotateCW(s.piece.shape);
      for (const kick of [0, -1, 1, -2, 2]) {
        const p = { ...s.piece, shape: rotated, x: s.piece.x + kick };
        if (!collides(s.board, p)) return { ...s, piece: p };
      }
      return s;
    }), []);

  const softDrop = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over || s.paused) return s;
      const moved  = { ...s.piece, y: s.piece.y + 1 };
      const score  = s.score + 1;
      const coins  = s.coins + coinDelta(s.score, score);
      if (collides(s.board, moved)) return lockPiece(s);
      return { ...s, piece: moved, score, coins };
    }), []);

  const hardDrop = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over || s.paused) return s;
      const gy    = ghostRow(s.board, s.piece);
      const score = s.score + (gy - s.piece.y) * 2;
      const coins = s.coins + coinDelta(s.score, score);
      return lockPiece({ ...s, piece: { ...s.piece, y: gy }, score, coins });
    }), []);

  const pause = useCallback(() =>
    setGs(s => {
      if (!s.running || s.over) return s;
      return { ...s, paused: !s.paused };
    }), []);

  useEffect(() => {
    const onKey = (e) => {
      const { running, over } = gsRef.current;
      switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); left();     break;
        case 'ArrowRight': e.preventDefault(); right();    break;
        case 'ArrowDown':  e.preventDefault(); softDrop(); break;
        case 'ArrowUp':    e.preventDefault(); rotate();   break;
        case 'Space':
          e.preventDefault();
          if (!running || over) start();
          else hardDrop();
          break;
        case 'KeyP': e.preventDefault(); pause(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [left, right, softDrop, rotate, hardDrop, pause, start]);

  const ghost = gs.running && !gs.over ? ghostRow(gs.board, gs.piece) : null;

  return { ...gs, ghost, start, pause, buyItem, cheatCoins };
};
