import sqlite3
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = os.path.join(os.path.dirname(__file__), "scores.db")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            wave INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    conn.commit()
    conn.close()


init_db()


class ScoreSubmit(BaseModel):
    name: str
    score: int
    wave: int


@app.get("/scores")
def get_scores():
    conn = get_db()
    rows = conn.execute(
        "SELECT name, score, wave FROM scores ORDER BY score DESC LIMIT 10"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/scores")
def submit_score(data: ScoreSubmit):
    name = data.name.strip()[:20] or "Anonymous"
    conn = get_db()
    conn.execute(
        "INSERT INTO scores (name, score, wave) VALUES (?, ?, ?)",
        (name, max(0, data.score), max(1, data.wave)),
    )
    conn.commit()
    conn.close()
    return {"ok": True}
