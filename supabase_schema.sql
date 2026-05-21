-- ============================================================
-- 찬양 PPT 생성기 - Supabase DB 스키마
-- Supabase SQL Editor 에서 실행하세요
-- ============================================================

-- 1. lyrics 테이블
CREATE TABLE IF NOT EXISTS lyrics (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    song_title      TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    artist          TEXT,
    lyrics          TEXT NOT NULL,
    source          TEXT NOT NULL CHECK (source IN ('manual', 'youtube')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lyrics_title_normalized ON lyrics (title_normalized);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lyrics_updated_at
    BEFORE UPDATE ON lyrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 2. ppt_jobs 테이블
CREATE TABLE IF NOT EXISTS ppt_jobs (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id   TEXT,
    status       TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    config       JSONB NOT NULL DEFAULT '{}',
    file_path    TEXT,
    download_url TEXT,
    error_msg    TEXT,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppt_jobs_session ON ppt_jobs (session_id);
CREATE INDEX IF NOT EXISTS idx_ppt_jobs_status ON ppt_jobs (status);


-- ============================================================
-- Supabase Storage 버킷 설정 (Storage > New Bucket 에서 직접 생성)
-- 버킷명: ppt-files     (비공개)
-- 버킷명: user-images   (비공개)
-- ============================================================

-- RLS 정책: service_role 키로만 접근 (비로그인 사용자 직접 접근 차단)
ALTER TABLE lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_jobs ENABLE ROW LEVEL SECURITY;

-- 백엔드(service_role)는 RLS 우회 → 별도 정책 불필요
-- 프론트에서 직접 DB 접근하지 않음
