import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from services.db import get_client
from services.ppt_service import build_pptx
from services.storage_service import upload_pptx, create_signed_url

router = APIRouter()


class Slide(BaseModel):
    order: int
    lyrics: str


class TextPosition(BaseModel):
    x: float = 50
    y: float = 75


class PPTSettings(BaseModel):
    font_family: str = "NanumGothic"
    font_size: int = 36
    text_position: TextPosition = TextPosition()
    bg_type: str = "black"
    bg_value: str | None = None
    overlay_opacity: float = 0.0


class GenerateRequest(BaseModel):
    slides: list[Slide]
    settings: PPTSettings
    session_id: str | None = None
    songs: list[str] = []


@router.post("/generate")
async def generate_ppt(req: GenerateRequest, background_tasks: BackgroundTasks):
    db = get_client()
    job_id = str(uuid.uuid4())

    config = {
        "songs": req.songs,
        "slides": [s.model_dump() for s in req.slides],
        "settings": req.settings.model_dump(),
    }

    db.table("ppt_jobs").insert({
        "id": job_id,
        "session_id": req.session_id,
        "status": "PENDING",
        "config": config,
    }).execute()

    background_tasks.add_task(_process_job, job_id, req.slides, req.settings)

    return {"job_id": job_id}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    db = get_client()
    result = db.table("ppt_jobs").select("*").eq("id", job_id).limit(1).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Job을 찾을 수 없습니다.")

    job = result.data[0]
    if job["status"] == "DONE":
        return {
            "status": "DONE",
            "download_url": job["download_url"],
            "expires_at": job["expires_at"],
        }
    elif job["status"] == "FAILED":
        return {"status": "FAILED", "error": job["error_msg"]}
    else:
        return {"status": job["status"]}


async def _process_job(job_id: str, slides: list[Slide], settings: PPTSettings):
    db = get_client()

    try:
        db.table("ppt_jobs").update({"status": "PROCESSING"}).eq("id", job_id).execute()

        slides_data = [s.model_dump() for s in slides]
        settings_data = settings.model_dump()

        pptx_bytes = await build_pptx(slides_data, settings_data)

        file_path = upload_pptx(job_id, pptx_bytes)

        signed_url = create_signed_url(file_path, expires_in=3600)
        expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat()

        db.table("ppt_jobs").update({
            "status": "DONE",
            "file_path": file_path,
            "download_url": signed_url,
            "expires_at": expires_at,
        }).eq("id", job_id).execute()

    except Exception as e:
        db.table("ppt_jobs").update({
            "status": "FAILED",
            "error_msg": str(e),
        }).eq("id", job_id).execute()
