from fastapi import APIRouter
from pydantic import BaseModel
from services.lyrics_service import (
    normalize_title,
    search_db,
    search_tavily,
    extract_lyrics_with_llm,
    save_lyrics,
)

router = APIRouter()


class SearchRequest(BaseModel):
    song_title: str           # 검색 쿼리 (아티스트 포함 가능)
    title_only: str | None = None  # DB 검색 키용 (곡명만)


class SaveRequest(BaseModel):
    song_title: str
    artist: str | None = None
    lyrics: str
    source: str = "manual"


@router.post("/search")
async def search_lyrics(req: SearchRequest):
    db_title = req.title_only or req.song_title
    normalized = normalize_title(db_title)

    # ① DB 조회
    row = search_db(normalized)
    if row:
        return {"status": "found", "lyrics": row["lyrics"], "source": row["source"]}

    # ② Tavily로 웹 검색 → ③ LLM 추출 (저장 없이 반환만)
    raw_text = await search_tavily(req.song_title)
    if raw_text:
        lyrics = await extract_lyrics_with_llm(raw_text, db_title)
        if lyrics:
            return {"status": "found", "lyrics": lyrics, "source": "tavily"}

    # ④ 수동 입력 폴백
    return {"status": "not_found"}


@router.post("/save")
async def save_lyrics_manual(req: SaveRequest):
    row = save_lyrics(req.song_title, req.artist, req.lyrics, req.source)
    return {"status": "saved", "id": row["id"]}
