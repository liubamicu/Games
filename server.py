"""One-port Games Hub.

Serves the hub landing page, all three built games, and Snake's realtime
WebSocket backend from a single FastAPI app on one port (default 4000):

    /          -> hub menu (hub/index.html, links rewritten to local subpaths)
    /banana/   -> Banana Invaders  (space-invaders/frontend/dist)
    /snake/    -> Banana Snake      (snake-game/frontend/dist)
    /tetris/   -> Tetris            (tetris-game/build)
    /ws        -> Snake game WebSocket

Run:  py server.py          (or)   py -m uvicorn server:app --port 4000
Rebuild the games first with `npm run build` in each game folder.
"""

import os
import sys
import json
import asyncio
import threading
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE = os.path.dirname(os.path.abspath(__file__))

# Reuse the existing Snake game logic from the standalone backend.
sys.path.insert(0, os.path.join(BASE, "snake-game", "backend"))
from game import SnakeGame, Direction  # noqa: E402

app = FastAPI(title="Games Hub (one port)")

# Let the standalone dev servers reach the score API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

TICK_INTERVAL = 0.15  # seconds per Snake tick


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    game = SnakeGame()

    async def game_loop():
        while True:
            game.tick()
            await websocket.send_text(json.dumps(game.state()))
            if game.game_over:
                break
            await asyncio.sleep(TICK_INTERVAL)

    loop_task = asyncio.create_task(game_loop())
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "direction":
                try:
                    game.set_direction(Direction(msg["value"]))
                except ValueError:
                    pass
            elif msg.get("type") == "restart":
                loop_task.cancel()
                game.reset()
                loop_task = asyncio.create_task(game_loop())
    except WebSocketDisconnect:
        loop_task.cancel()


@app.get("/", response_class=HTMLResponse)
def hub():
    """Serve the existing hub page, rewriting the per-port game URLs to local subpaths."""
    with open(os.path.join(BASE, "hub", "index.html"), encoding="utf-8") as f:
        html = f.read()
    html = (
        html.replace("http://localhost:5173", "/banana/")
            .replace("http://localhost:5174", "/snake/")
            .replace("http://localhost:5175", "/tetris/")
    )
    return HTMLResponse(html)


# ---- Per-game high-score boards (one JSON file per game) ----
SCORES_DIR = os.path.join(BASE, "scores")
os.makedirs(SCORES_DIR, exist_ok=True)
ALLOWED_GAMES = {"banana", "snake", "tetris"}
MAX_KEEP = 100
_scores_lock = threading.Lock()


class ScoreIn(BaseModel):
    name: str
    score: int
    detail: str = ""


def _scores_path(game):
    return os.path.join(SCORES_DIR, f"{game}.json")


def _load_scores(game):
    try:
        with open(_scores_path(game), encoding="utf-8") as f:
            rows = json.load(f)
        return rows if isinstance(rows, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _ranked(rows):
    return sorted(rows, key=lambda r: (-int(r.get("score", 0)), r.get("ts", "")))


@app.get("/api/scores/{game}")
def get_scores(game: str):
    if game not in ALLOWED_GAMES:
        return JSONResponse({"error": "unknown game"}, status_code=404)
    with _scores_lock:
        return _ranked(_load_scores(game))[:10]


@app.post("/api/scores/{game}")
def post_score(game: str, entry: ScoreIn):
    if game not in ALLOWED_GAMES:
        return JSONResponse({"error": "unknown game"}, status_code=404)
    name = (entry.name or "").strip()[:20] or "Player"
    score = max(0, int(entry.score))
    detail = (entry.detail or "").strip()[:40]
    ts = datetime.now(timezone.utc).isoformat()
    key = name.lower()
    with _scores_lock:
        rows = _load_scores(game)
        existing = next((r for r in rows if str(r.get("name", "")).lower() == key), None)
        if existing is None:
            rows.append({"name": name, "score": score, "detail": detail, "ts": ts})
        elif score > int(existing.get("score", 0)):
            existing.update({"name": name, "score": score, "detail": detail, "ts": ts})
        rows = _ranked(rows)[:MAX_KEEP]
        with open(_scores_path(game), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)
    ranked = _ranked(rows)
    rank = next((i + 1 for i, r in enumerate(ranked) if str(r.get("name", "")).lower() == key), None)
    return {"top": ranked[:10], "rank": rank, "you": name}


def mount_game(path, *parts):
    full = os.path.join(BASE, *parts)
    if os.path.isdir(full):
        app.mount(path, StaticFiles(directory=full, html=True), name=path.strip("/"))
    else:
        print(f"[warn] missing build for {path}: {full} -- run `npm run build` in that game folder")


# Order matters: these specific mounts are added after the "/" and "/ws" routes above.
mount_game("/banana", "space-invaders", "frontend", "dist")
mount_game("/snake", "snake-game", "frontend", "dist")
mount_game("/tetris", "tetris-game", "build")


if __name__ == "__main__":
    import uvicorn

    # On a server set HOST=0.0.0.0 to accept external connections; PORT defaults to 4000.
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "4000"))
    uvicorn.run(app, host=host, port=port)
