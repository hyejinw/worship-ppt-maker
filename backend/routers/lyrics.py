from fastapi import APIRouter
from pydantic import BaseModel
from services.lyrics_service import normalize_title, search_db, search_youtube, save_lyrics

router = APIRouter()


class SearchRequest(BaseModel):
    song_title: str           # YouTube 검색용 (아티스트 포함 가능)
    title_only: str | None = None  # DB 검색 키용 (곡명만)


class SaveRequest(BaseModel):
    song_title: str
    artist: str | None = None
    lyrics: str


@router.post("/search")
async def search_lyrics(req: SearchRequest):
    # DB는 곡명만으로 검색
    db_title = req.title_only or req.song_title
    normalized = normalize_title(db_title)

    # 1. DB 조회
    row = search_db(normalized)
    if row:
        return {"status": "found", "lyrics": row["lyrics"], "source": row["source"]}

    # 2. YouTube 자막 시도 (아티스트 포함 쿼리 사용)
    lyrics = await search_youtube(req.song_title)
    if lyrics:
        save_lyrics(db_title, None, lyrics, "youtube")
        return {"status": "found", "lyrics": lyrics, "source": "youtube"}

    return {"status": "not_found"}


@router.post("/save")
async def save_lyrics_manual(req: SaveRequest):
    row = save_lyrics(req.song_title, req.artist, req.lyrics, "manual")
    return {"status": "saved", "id": row["id"]}
