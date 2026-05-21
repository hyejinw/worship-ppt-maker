from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gemini_service import split_lyrics_to_slides, extract_image_keywords

router = APIRouter()


class SplitRequest(BaseModel):
    lyrics: str


class KeywordsRequest(BaseModel):
    lyrics: str


@router.post("/split")
async def split_slides(req: SplitRequest):
    if not req.lyrics.strip():
        raise HTTPException(status_code=400, detail="가사를 입력해주세요.")
    try:
        slides = await split_lyrics_to_slides(req.lyrics)
        return {"slides": slides}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 슬라이드 구분 실패: {str(e)}")


@router.post("/keywords")
async def get_keywords(req: KeywordsRequest):
    try:
        keywords = await extract_image_keywords(req.lyrics)
        return {"keywords": keywords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"키워드 추출 실패: {str(e)}")
