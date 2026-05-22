import os
from groq import Groq

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    return _client


MODEL = "llama-3.3-70b-versatile"

SLIDE_SPLIT_PROMPT = """다음은 찬양곡 가사야.
PPT 슬라이드 단위로 자연스럽게 구분해줘.

규칙:
- 의미 단위(절/후렴/브릿지)를 기준으로 구분
- 슬라이드당 2줄(최대 3줄)
- 한 줄이 너무 길면(20자 이상) 단독 슬라이드도 가능
- 슬라이드 구분은 // 로 표시
- 가사 내용은 절대 수정하지 말 것
- // 와 가사 텍스트만 반환, 다른 말 하지 말 것

가사:
{lyrics}"""


async def split_lyrics_to_slides(lyrics: str) -> list[dict]:
    client = _get_client()
    prompt = SLIDE_SPLIT_PROMPT.format(lyrics=lyrics)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    result = response.choices[0].message.content.strip()
    slides = [s.strip() for s in result.split("//") if s.strip()]
    return [{"order": i + 1, "lyrics": slide} for i, slide in enumerate(slides)]


async def extract_image_keywords(lyrics: str) -> list[str]:
    client = _get_client()
    prompt = f"""다음 찬양 가사에서 배경 이미지 검색에 적합한 영어 키워드 3개를 추출해줘.
키워드만 쉼표로 구분해서 반환해줘. 예: light, worship, heaven

가사:
{lyrics[:300]}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    keywords = [k.strip() for k in raw.split(",") if k.strip()]
    return keywords[:3]
