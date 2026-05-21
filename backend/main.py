from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import lyrics, ai, images, ppt

app = FastAPI(title="Worship PPT API", version="1.0.0")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lyrics.router, prefix="/api/lyrics", tags=["lyrics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(ppt.router, prefix="/api/ppt", tags=["ppt"])


@app.get("/health")
def health():
    return {"status": "ok"}
