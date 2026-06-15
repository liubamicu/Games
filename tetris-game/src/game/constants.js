export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

export const PIECES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00e5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffea00' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#d500f9' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00e676' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff1744' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#2979ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff9100' },
};

export const PIECE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const SCORES_PER_LINE = { 1: 100, 2: 300, 3: 500, 4: 800 };

export const SPEEDS = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100, 83];
