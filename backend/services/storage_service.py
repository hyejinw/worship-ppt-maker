import os
from datetime import timedelta
from .db import get_client

BUCKET = "ppt-files"


def upload_pptx(job_id: str, data: bytes) -> str:
    db = get_client()
    file_path = f"ppt/{job_id}.pptx"

    db.storage.from_(BUCKET).upload(
        file_path,
        data,
        file_options={"content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    )
    return file_path


def create_signed_url(file_path: str, expires_in: int = 3600) -> str:
    db = get_client()
    result = db.storage.from_(BUCKET).create_signed_url(file_path, expires_in)
    return result["signedURL"]


def upload_user_image(filename: str, data: bytes, content_type: str) -> str:
    db = get_client()
    file_path = f"backgrounds/{filename}"

    db.storage.from_("user-images").upload(
        file_path,
        data,
        file_options={"content-type": content_type},
    )

    result = db.storage.from_("user-images").create_signed_url(file_path, 86400)
    return result["signedURL"]
