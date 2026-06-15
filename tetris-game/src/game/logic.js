import { COLS, ROWS, PIECES, PIECE_KEYS } from './constants';

export const emptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

export const rotateCW = (shape) => {
  const rows = shape.length;
  const cols = shape[0].length;
  const next = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      next[c][rows - 1 - r] = shape[r][c];
  return next;
};

export const spawnPiece = () => {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const def = PIECES[key];
  return {
    key,
    shape: def.shape,
    color: def.color,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0,
  };
};

export const collides = (board, piece) => {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const nx = piece.x + c;
      const ny = piece.y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
};

export const merge = (board, piece) => {
  const b = board.map(row => [...row]);
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0) b[ny][nx] = piece.color;
      }
  return b;
};

export const sweep = (board) => {
  const kept = board.filter(row => row.some(cell => cell === null));
  const cleared = ROWS - kept.length;
  const top = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...top, ...kept], cleared };
};

export const ghostRow = (board, piece) => {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 })) y++;
  return y;
};

// Clears the bottom `n` rows and prepends empty rows at the top
export const clearBottomRows = (board, n) => {
  const kept  = board.slice(0, ROWS - n);
  const empty = Array.from({ length: n }, () => Array(COLS).fill(null));
  return [...empty, ...kept];
};
