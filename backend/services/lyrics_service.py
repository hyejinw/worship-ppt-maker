import re
import os
import httpx
from .db import get_client


def normalize_title(title: str) -> str:
    title = title.lower()
    title = re.sub(r"\(.*?\)|\[.*?\]", "", title)
    title = re.sub(r"[^\w가-힣]", "", title)
    return title.strip()


def search_db(title_normalized: str) -> dict | None:
    db = get_client()
    result = (
        db.table("lyrics")
        .select("*")
        .eq("title_normalized", title_normalized)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


async def search_youtube(song_title: str) -> str | None:
    api_key = os.getenv("YOUTUBE_DATA_API_KEY", "")
    if not api_key:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        search_resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": f"{song_title} 가사",
                "type": "video",
                "maxResults": 3,
                "key": api_key,
            },
        )
        if search_resp.status_code != 200:
            return None

        items = search_resp.json().get("items", [])
        if not items:
            return None

        for item in items:
            video_id = item["id"]["videoId"]
            cap_resp = await client.get(
                "https://www.googleapis.com/youtube/v3/captions",
                params={"part": "snippet", "videoId": video_id, "key": api_key},
            )
            if cap_resp.status_code != 200:
                continue

            captions = cap_resp.json().get("items", [])
            korean_caps = [
                c for c in captions if c["snippet"]["language"] in ("ko", "ko-KR")
            ]
            if korean_caps:
                # 자막이 존재하면 비디오 설명에서 가사 추출 시도
                detail_resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params={
                        "part": "snippet",
                        "id": video_id,
                        "key": api_key,
                    },
                )
                if detail_resp.status_code == 200:
                    videos = detail_resp.json().get("items", [])
                    if videos:
                        description = videos[0]["snippet"].get("description", "")
                        lyrics = _extract_lyrics_from_description(description)
                        if lyrics:
                            return lyrics

    return None


def _extract_lyrics_from_description(description: str) -> str | None:
    lines = description.split("\n")
    lyric_lines = []
    in_lyrics = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_lyrics and lyric_lines:
                lyric_lines.append("")
            continue

        # URL, 해시태그, 특수 접두어 라인 스킵
        if stripped.startswith(("http", "#", "©", "℗", "Produced", "Written", "Music", "Artist", "Album")):
            continue

        # 짧고 한글 비율 높은 라인만 가사로 판단
        korean_ratio = len(re.findall(r"[가-힣]", stripped)) / max(len(stripped), 1)
        if korean_ratio > 0.3 and len(stripped) < 50:
            in_lyrics = True
            lyric_lines.append(stripped)

    if len(lyric_lines) < 4:
        return None

    return "\n".join(lyric_lines).strip()


def save_lyrics(song_title: str, artist: str | None, lyrics: str, source: str) -> dict:
    db = get_client()
    title_normalized = normalize_title(song_title)

    existing = search_db(title_normalized)
    if existing:
        result = (
            db.table("lyrics")
            .update({"lyrics": lyrics, "artist": artist, "source": source, "updated_at": "now()"})
            .eq("id", existing["id"])
            .execute()
        )
        return result.data[0]

    result = (
        db.table("lyrics")
        .insert({
            "song_title": song_title,
            "title_normalized": title_normalized,
            "artist": artist,
            "lyrics": lyrics,
            "source": source,
        })
        .execute()
    )
    return result.data[0]
