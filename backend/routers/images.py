import os
import uuid
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from services.storage_service import upload_user_image

router = APIRouter()

DEFAULT_IMAGES = [
    {"id": "light1", "url": "/defaults/light1.jpg", "label": "빛"},
    {"id": "nature1", "url": "/defaults/nature1.jpg", "label": "자연"},
    {"id": "worship1", "url": "/defaults/worship1.jpg", "label": "예배"},
    {"id": "cross1", "url": "/defaults/cross1.jpg", "label": "십자가"},
]


@router.get("/unsplash")
async def search_unsplash(q: str = Query(..., min_length=1)):
    access_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
    if not access_key:
        return {"photos": []}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://api.unsplash.com/search/photos",
            params={"query": q, "per_page": 12, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {access_key}"},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Unsplash 검색 실패")

    data = resp.json()
    photos = [
        {
            "id": p["id"],
            "thumb": p["urls"]["small"],
            "full": p["urls"]["regular"],
            "credit": p["user"]["name"],
            "credit_url": p["user"]["links"]["html"],
        }
        for p in data.get("results", [])
    ]
    return {"photos": photos}


@router.get("/default")
def get_default_images():
    return {"images": DEFAULT_IMAGES}


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="JPG, PNG, WebP 파일만 업로드 가능합니다.")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"

    try:
        signed_url = upload_user_image(filename, data, file.content_type)
        return {"url": signed_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")
