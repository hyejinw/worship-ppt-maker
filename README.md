# 찬양 PPT 생성기

> 곡명 입력 → 가사 자동 수집 → AI 슬라이드 구분 → .pptx 다운로드

## 스택

| 레이어 | 기술 |
|---|---|
| 프론트 | Next.js 14 (App Router) + Zustand + Tailwind |
| 백엔드 | FastAPI (Python 3.11) |
| DB | Supabase PostgreSQL |
| 스토리지 | Supabase Storage |
| AI | Gemini 2.5 Flash-Lite |
| 이미지 | Unsplash API |
| PPT 생성 | python-pptx |

---

## 로컬 개발 시작

### 1. 환경변수 설정

```bash
# 백엔드
cp backend/.env.example backend/.env
# 아래 값들을 채워주세요:
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# GOOGLE_GEMINI_API_KEY, YOUTUBE_DATA_API_KEY, UNSPLASH_ACCESS_KEY

# 프론트엔드
cp frontend/.env.local.example frontend/.env.local
```

### 2. Supabase DB 설정

Supabase 프로젝트 생성 후 SQL Editor에서 `supabase_schema.sql` 실행.

Storage에서 버킷 2개 생성:
- `ppt-files` (비공개)
- `user-images` (비공개)

### 3. 폰트 파일 배치

`backend/fonts/` 폴더에 아래 TTF 파일 배치 (OFL 라이선스):
- `NanumGothic.ttf`
- `NanumMyeongjo.ttf`
- `NanumSquare.ttf`
- `NotoSansKR.ttf`

다운로드: [눈누](https://noonnu.cc) / [Google Fonts](https://fonts.google.com)

### 4. 실행

**Docker로 실행:**
```bash
docker-compose up
```

**직접 실행:**
```bash
# 백엔드
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev
```

- 프론트: http://localhost:3000
- 백엔드: http://localhost:8000
- API 문서: http://localhost:8000/docs

---

## 파일 구조

```
worship-ppt/
├── frontend/               # Next.js
│   ├── app/
│   │   ├── page.tsx        # 홈
│   │   ├── editor/
│   │   │   ├── step1/      # 곡 선택
│   │   │   ├── step2/      # 슬라이드 편집
│   │   │   └── step3/      # PPT 설정
│   │   └── done/           # 완료/다운로드
│   ├── components/
│   ├── store/              # Zustand
│   └── lib/                # API 호출, localStorage
│
├── backend/                # FastAPI
│   ├── main.py
│   ├── routers/            # lyrics, ai, images, ppt
│   ├── services/           # 비즈니스 로직
│   └── fonts/              # TTF 폰트 파일 (직접 배치 필요)
│
├── supabase_schema.sql     # DB 스키마
└── docker-compose.yml
```

---

## 배포

- **프론트**: Vercel — `frontend/` 루트, `NEXT_PUBLIC_API_URL` 환경변수 설정
- **백엔드**: Railway — `backend/` 루트, 환경변수 설정, `fonts/` 폴더 포함

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/lyrics/search` | 곡명으로 가사 조회 |
| POST | `/api/lyrics/save` | 수동 입력 가사 저장 |
| POST | `/api/ai/split` | AI 슬라이드 자동 구분 |
| POST | `/api/ai/keywords` | 이미지 검색 키워드 추출 |
| GET | `/api/images/unsplash` | Unsplash 이미지 검색 |
| GET | `/api/images/default` | 기본 이미지 목록 |
| POST | `/api/images/upload` | 배경 이미지 업로드 |
| POST | `/api/ppt/generate` | PPT 생성 요청 |
| GET | `/api/ppt/jobs/{id}` | 생성 상태 폴링 |
