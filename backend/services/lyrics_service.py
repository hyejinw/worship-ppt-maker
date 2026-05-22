import re
import os
import httpx
import logging
from datetime import datetime
from pathlib import Path
from .db import get_client

logger = logging.getLogger(__name__)

DEBUG_DIR = Path(__file__).parent.parent / "debug_logs"
DEBUG_DIR.mkdir(exist_ok=True)


def _write_debug(label: str, song_title: str, content: str) -> None:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_title = re.sub(r"[^\w가-힣]", "_", song_title)[:30]
    path = DEBUG_DIR / f"{ts}_{label}_{safe_title}.txt"
    path.write_text(content, encoding="utf-8")
    logger.info("[DEBUG] %s 결과 저장 → %s", label, path)


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


async def search_tavily(song_title: str) -> str | None:
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return None

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": f"{song_title} 찬양 가사",
                "search_depth": "basic",
                "include_raw_content": True,
                "max_results": 3,
            },
        )
        if resp.status_code != 200:
            return None

        results = resp.json().get("results", [])
        for r in results:
            content = r.get("raw_content") or r.get("content") or ""
            if content and len(content) > 100:
                _write_debug("tavily", song_title, f"URL: {r.get('url', '')}\n\n{content}")
                return content

    return None


async def extract_lyrics_with_gemini(raw_text: str, song_title: str) -> str | None:
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None

    client = Groq(api_key=api_key)

    prompt = f"""다음은 웹 페이지에서 가져온 텍스트야. '{song_title}' 찬양곡의 가사만 추출해줘.

규칙:
- 광고, 메뉴, 저작권 문구, 관련 링크, 아티스트 소개 등은 모두 제거
- 실제 가사 텍스트만 줄바꿈 유지해서 반환
- 가사가 없으면 "NONE" 반환
- 다른 설명 없이 가사만 반환

텍스트:
{raw_text[:3000]}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        result = response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("[Groq] 호출 실패: %s", e)
        return None

    _write_debug("groq", song_title, result)
    if result == "NONE" or len(result) < 20:
        return None
    return result


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
