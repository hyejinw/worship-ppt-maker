import io
import uuid
import zipfile
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from services.db import get_client
from services.ppt_service import build_pptx
from services.storage_service import upload_pptx, upload_zip, create_signed_url
from services.lyrics_service import normalize_title, search_db, save_lyrics

logger = logging.getLogger(__name__)

router = APIRouter()


class Slide(BaseModel):
    order: int
    lyrics: str
    song_id: str | None = None


class TextPosition(BaseModel):
    x: float = 50
    y: float = 30


class PPTSettings(BaseModel):
    font_family: str = "NanumGothic"
    font_size: int = 40
    font_color: str = "#ffffff"
    text_position: TextPosition = TextPosition()
    bg_type: str = "black"
    bg_value: str | None = None
    overlay_opacity: float = 0.0
    show_title: bool = True
    merge_songs: bool = True
    export_song_id: str | None = None
    separator_slides: bool = True


class SongData(BaseModel):
    id: str
    title: str
    lyrics: str | None = None
    artist: str | None = None
    source: str | None = None
    settings: PPTSettings | None = None


class GenerateRequest(BaseModel):
    slides: list[Slide]
    settings: PPTSettings
    session_id: str | None = None
    songs: list[str] = []
    songs_data: list[SongData] = []
    merge_songs: bool = True
    export_song_id: str | None = None


@router.post("/generate")
async def generate_ppt(req: GenerateRequest, background_tasks: BackgroundTasks):
    db = get_client()
    job_id = str(uuid.uuid4())

    config = {
        "songs": req.songs,
        "slides": [s.model_dump() for s in req.slides],
        "settings": req.settings.model_dump(),
        "merge_songs": req.merge_songs,
        "export_song_id": req.export_song_id,
    }

    db.table("ppt_jobs").insert({
        "id": job_id,
        "session_id": req.session_id,
        "status": "PENDING",
        "config": config,
    }).execute()

    background_tasks.add_task(
        _process_job, job_id, req.slides, req.settings,
        req.songs_data, req.merge_songs, req.export_song_id,
    )

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


async def _process_job(
    job_id: str,
    slides: list[Slide],
    settings: PPTSettings,
    songs_data: list[SongData],
    merge_songs: bool,
    export_song_id: str | None,
):
    db = get_client()

    try:
        db.table("ppt_jobs").update({"status": "PROCESSING"}).eq("id", job_id).execute()

        # DB에 없는 곡 가사 저장 (실패해도 PPT 생성은 계속)
        for song in songs_data:
            if not song.lyrics:
                continue
            try:
                normalized = normalize_title(song.title)
                if not search_db(normalized):
                    source = song.source if song.source in ("manual", "tavily") else "manual"
                    save_lyrics(song.title, song.artist, song.lyrics, source)
                    logger.info("[lyrics] 저장 완료: %s (source=%s)", song.title, source)
                else:
                    logger.info("[lyrics] 이미 존재: %s", song.title)
            except Exception as lyrics_err:
                logger.warning("[lyrics] 저장 실패 (무시): %s | %s", song.title, lyrics_err)

        slides_data = [s.model_dump() for s in slides]
        settings_data = settings.model_dump()
        songs_data_raw = [s.model_dump() for s in songs_data]

        if merge_songs:
            # 모든 곡 합쳐서 하나의 pptx
            pptx_bytes = await build_pptx(
                slides_data, settings_data,
                songs_data=songs_data_raw,
                merge_songs=True,
                export_song_id=None,
            )
            file_path = upload_pptx(job_id, pptx_bytes)
            signed_url = create_signed_url(file_path, expires_in=3600)
        else:
            # 곡별 따로: 각 곡마다 pptx 생성 후 ZIP
            if len(songs_data) <= 1:
                # 곡이 하나면 그냥 단일 pptx
                sid = songs_data[0].id if songs_data else None
                song_settings = songs_data[0].settings.model_dump() if (songs_data and songs_data[0].settings) else settings_data
                pptx_bytes = await build_pptx(
                    slides_data, song_settings,
                    songs_data=songs_data_raw,
                    merge_songs=False,
                    export_song_id=sid,
                )
                file_path = upload_pptx(job_id, pptx_bytes)
                signed_url = create_signed_url(file_path, expires_in=3600)
            else:
                # 여러 곡: ZIP으로
                zip_buf = io.BytesIO()
                with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    for song in songs_data:
                        song_settings = song.settings.model_dump() if song.settings else settings_data
                        pptx_bytes = await build_pptx(
                            slides_data, song_settings,
                            songs_data=songs_data_raw,
                            merge_songs=False,
                            export_song_id=song.id,
                        )
                        safe_title = song.title.replace("/", "_").replace("\\", "_")
                        zf.writestr(f"{safe_title}.pptx", pptx_bytes)

                zip_bytes = zip_buf.getvalue()
                file_path = upload_zip(job_id, zip_bytes)
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
