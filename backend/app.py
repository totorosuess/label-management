from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"


def load_tokens():
    env_edit = os.getenv("EDIT_TOKEN")
    env_read = os.getenv("READ_TOKEN")
    if env_edit or env_read:
        return {
            "edit": env_edit or "",
            "readonly": env_read or "",
        }

    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return {
                "edit": data.get("edit_token", ""),
                "readonly": data.get("read_token", ""),
            }

    return {
        "edit": "edit-token-123",
        "readonly": "read-token-123",
    }


@app.get("/api/permission")
def permission(token: str):
    tokens = load_tokens()
    if token == tokens.get("edit"):
        return {"mode": "edit"}
    if token == tokens.get("readonly"):
        return {"mode": "readonly"}
    raise HTTPException(status_code=401, detail="invalid token")


@app.get("/api/health")
def health():
    return {"status": "ok"}
