import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from game import SnakeGame, Direction

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TICK_INTERVAL = 0.15  # seconds per game tick


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
