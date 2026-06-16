# SHP Arcade

A small arcade hub with three games — 🍌 **Banana Invaders**, 🐍 **Banana Snake**, 🟦 **Tetris** —
served from a single Python server on one port. Each game has its own high-score board.

## Run it (one port — recommended for a server)

Everything (the hub, all three games, and Snake's realtime backend) is served by `server.py`
on **http://localhost:4000**.

**Prerequisites:** Python 3.10+ and Node.js 18+.

**Windows:** double-click **`start-oneport.bat`** — it installs deps, builds all three games, and starts the server.

**Manual / Linux / macOS:**

```bash
# 1. Python deps for the server
pip install -r requirements.txt

# 2. Build the three games (static bundles)
cd space-invaders/frontend && npm install && npm run build && cd ../..
cd snake-game/frontend     && npm install && npm run build && cd ../..
cd tetris-game             && npm install && npm run build && cd ..

# 3. Run the server
python server.py
```

### Deploying on a server

`server.py` reads two environment variables:

| Var  | Default     | Notes |
|------|-------------|-------|
| `HOST` | `127.0.0.1` | set to `0.0.0.0` to accept external connections |
| `PORT` | `4000`      | port to listen on |

```bash
HOST=0.0.0.0 PORT=8080 python server.py
```

Behind HTTPS, Snake's WebSocket automatically switches to `wss://` (same origin) — no extra config.
After changing a game's code, rebuild that game (`npm run build` in its folder) and restart the server.

## High scores

Each game stores its board as a JSON file under `scores/` (`banana.json`, `snake.json`, `tetris.json`),
created on first save. One entry per name (best score kept). The `scores/` folder is git-ignored.

## Routes

| Path | Serves |
|------|--------|
| `/` | hub menu |
| `/banana/` | Banana Invaders |
| `/snake/` | Banana Snake |
| `/tetris/` | Tetris |
| `/ws` | Snake realtime WebSocket |
| `/api/scores/<game>` | high-score API (GET top 10 / POST a score) |

## Dev mode (multi-port, hot reload)

For editing, `start-games.bat` (or `npm start`) runs each game on its own port with hot reload:
Banana `5173`, Snake `5174` + Python WS backend on `8000`, Tetris `5175`, hub on `4000`.
