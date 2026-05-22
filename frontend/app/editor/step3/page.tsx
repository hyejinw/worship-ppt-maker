"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { SlidePreview } from "@/components/editor/SlidePreview";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { ColorPicker } from "@/components/editor/ColorPicker";
import { usePPTStore, defaultSettings, PPTSettings, Slide } from "@/store/pptStore";
import { api } from "@/lib/api";
import { saveProject, getOrCreateSessionId } from "@/lib/localStorage";
import { ArrowLeft, Wand2, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { clsx } from "clsx";

const FONTS = [
  { value: "NanumGothic", label: "나눔고딕" },
  { value: "NanumMyeongjo", label: "나눔명조" },
  { value: "NanumSquare", label: "나눔스퀘어" },
  { value: "NotoSansKR", label: "Noto Sans KR" },
];

const GOOGLE_FONTS: Record<string, string> = {
  NanumGothic: "'Nanum Gothic', sans-serif",
  NanumMyeongjo: "'Nanum Myeongjo', serif",
  NanumSquare: "'Nanum Square', sans-serif",
  NotoSansKR: "'Noto Sans KR', sans-serif",
};

function SlideThumbnail({
  slide,
  settings,
  songTitle,
  index,
  active,
  onClick,
  isEmpty,
}: {
  slide?: Slide;
  settings: PPTSettings;
  songTitle?: string;
  index: number;
  active: boolean;
  onClick: () => void;
  isEmpty?: boolean;
}) {
  const { bg_type, bg_value, font_family, font_size, font_color, overlay_opacity } = settings;

  const bgStyle: React.CSSProperties = (() => {
    if (bg_type === "black") return { backgroundColor: "#000" };
    if (bg_type === "color" && bg_value) return { backgroundColor: bg_value };
    if (bg_type === "image" && bg_value)
      return { backgroundImage: `url(${bg_value})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { backgroundColor: "#000" };
  })();

  const scaledFont = Math.max(4, Math.round(font_size * (120 / 960)));

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-shrink-0 flex flex-col items-center gap-1 group",
      )}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded",
          active ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-[#555]"
        )}
        style={{ width: 120, height: 68, ...bgStyle }}
      >
        {overlay_opacity > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlay_opacity})` }} />
        )}
        {!isEmpty && slide?.lyrics && (
          <div className="absolute inset-0 flex items-center justify-center px-1">
            <p
              style={{
                fontFamily: GOOGLE_FONTS[font_family] || "sans-serif",
                fontSize: `${scaledFont}px`,
                color: font_color || "#ffffff",
                textAlign: "center",
                whiteSpace: "pre-line",
                lineHeight: 1.4,
                overflow: "hidden",
                maxHeight: "100%",
              }}
            >
              {slide.lyrics}
            </p>
          </div>
        )}
        {!isEmpty && settings.show_title && songTitle && (
          <div className="absolute bottom-0.5 right-1">
            <p style={{ fontFamily: GOOGLE_FONTS[font_family], fontSize: "4px", color: "rgba(200,200,200,0.9)" }}>
              {songTitle}
            </p>
          </div>
        )}
      </div>
      <span className={clsx("text-[10px]", active ? "text-accent" : "text-text-muted group-hover:text-text-primary")}>
        {index + 1}
      </span>
    </button>
  );
}

type PreviewItem =
  | { type: "slide"; slide: Slide; songTitle?: string }
  | { type: "separator" };

// 빈 구분 슬라이드 썸네일
function SeparatorThumbnail({ index, active, onClick, settings }: { index: number; active: boolean; onClick: () => void; settings: PPTSettings }) {
  const bgStyle: React.CSSProperties =
    settings.bg_type === "color" && settings.bg_value ? { backgroundColor: settings.bg_value }
    : settings.bg_type === "image" && settings.bg_value ? { backgroundImage: `url(${settings.bg_value})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: "#000" };

  return (
    <button
      onClick={onClick}
      className={clsx("flex-shrink-0 flex flex-col items-center gap-1 group")}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded flex items-center justify-center",
          active ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-[#555]"
        )}
        style={{ width: 120, height: 68, ...bgStyle }}
      >
        {settings.bg_type === "image" && settings.overlay_opacity > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${settings.overlay_opacity})` }} />
        )}
        <span className="relative text-[9px] text-white/30">빈 슬라이드</span>
      </div>
      <span className={clsx("text-[10px]", active ? "text-accent" : "text-text-muted group-hover:text-text-primary")}>
        {index + 1}
      </span>
    </button>
  );
}

function ThumbnailStrip({
  previewItems,
  safeIndex,
  activeSettings,
  onSelect,
}: {
  previewItems: PreviewItem[];
  safeIndex: number;
  activeSettings: PPTSettings;
  onSelect: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [safeIndex]);

  return (
    <div className="border-t border-border bg-bg-sub px-4 py-3">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
        {previewItems.map((item, i) => (
          <div key={i} ref={safeIndex === i ? activeRef : undefined} className="flex-shrink-0">
            {item.type === "separator" ? (
              <SeparatorThumbnail
                index={i}
                active={safeIndex === i}
                onClick={() => onSelect(i)}
                settings={activeSettings}
              />
            ) : (
              <SlideThumbnail
                slide={item.slide}
                settings={activeSettings}
                songTitle={item.songTitle}
                index={i}
                active={safeIndex === i}
                onClick={() => onSelect(i)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Step3() {
  const router = useRouter();
  const { slides, settings, updateSettings, songSettings, updateSongSettings, songs, slidesPerSong, setJob } = usePPTStore();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(
    settings.bg_type === "image" && !settings.bg_value?.includes("unsplash")
      ? settings.bg_value
      : null
  );
  const [bgColorValue, setBgColorValue] = useState<string>(
    settings.bg_type === "color" && settings.bg_value ? settings.bg_value : "#1a1a40"
  );

  const activeSongId = settings.merge_songs
    ? null
    : (settings.export_song_id ?? songs[0]?.id ?? null);

  const activeSettings: PPTSettings = settings.merge_songs
    ? settings
    : (activeSongId ? (songSettings[activeSongId] ?? { ...defaultSettings, show_title: false }) : settings);

  const activeUpdate = (patch: Partial<PPTSettings>) => {
    if (settings.merge_songs) {
      updateSettings(patch);
    } else if (activeSongId) {
      updateSongSettings(activeSongId, patch);
    }
  };

  const previewItems: PreviewItem[] = (() => {
    if (!settings.merge_songs) {
      const filtered = slides.filter((s) => s.song_id === activeSongId);
      return filtered.map((s) => ({ type: "slide" as const, slide: s }));
    }

    // merge 모드: 곡 순서대로 묶고, 곡 사이에 빈 슬라이드 삽입
    const songIds = songs.map((s) => s.id);
    const grouped: Record<string, Slide[]> = {};
    const ungrouped: Slide[] = [];

    for (const s of slides) {
      const sid = s.song_id;
      if (sid && songIds.includes(sid)) {
        if (!grouped[sid]) grouped[sid] = [];
        grouped[sid].push(s);
      } else {
        ungrouped.push(s);
      }
    }

    if (ungrouped.length > 0) {
      return slides.map((s) => ({ type: "slide" as const, slide: s }));
    }

    const items: PreviewItem[] = [];
    songIds.forEach((sid, i) => {
      const songTitle = songs.find((s) => s.id === sid)?.title;
      (grouped[sid] ?? []).forEach((s) => {
        items.push({ type: "slide", slide: s, songTitle });
      });
      if (settings.separator_slides && i < songIds.length - 1) {
        items.push({ type: "separator" });
      }
    });
    return items;
  })();

  const safeIndex = Math.min(Math.max(previewIndex, 0), Math.max(previewItems.length - 1, 0));
  const activeItem = previewItems[safeIndex] ?? previewItems[0];

  const activePreviewLyrics = activeItem?.type === "slide" ? activeItem.slide.lyrics : "";
  const activePreviewTitle = (() => {
    if (activeItem?.type !== "slide" || !activeSettings.show_title) return undefined;
    // merge 모드: previewItem에 songTitle 포함
    if (settings.merge_songs) return activeItem.songTitle;
    // 곡별 따로: 현재 선택된 곡 제목
    return songs.find((s) => s.id === activeSongId)?.title;
  })();

  // 키보드 좌우 화살표로 슬라이드 이동
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === "ArrowLeft") {
      setPreviewIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "ArrowRight") {
      setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1));
    }
  }, [previewItems.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 브라우저 Esc로 fullscreen 해제 시 상태 동기화
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleMergeToggle = (merged: boolean) => {
    updateSettings({
      merge_songs: merged,
      show_title: merged ? true : settings.show_title,
      export_song_id: merged ? null : (settings.export_song_id ?? songs[0]?.id ?? null),
    });
    setPreviewIndex(0);
  };

  const handleExportSongChange = (songId: string) => {
    updateSettings({ export_song_id: songId });
    setPreviewIndex(0);
  };

  const handleGenerate = async () => {
    if (slides.length === 0) return;
    setGenerating(true);

    try {
      const sessionId = getOrCreateSessionId();

      const songsWithSettings = songs.map((s) => {
        // 슬라이드가 있으면 슬라이드 가사(최종 편집 결과)를 우선 사용, 없으면 song.lyrics fallback
        const slideJoined = (slidesPerSong[s.id] ?? []).map((sl) => sl.lyrics).filter(Boolean).join("\n");
        const lyricsToSave = slideJoined || s.lyrics;
        return {
          id: s.id,
          title: s.title,
          lyrics: lyricsToSave || null,
          artist: s.artist || null,
          source: s.source || null,
          settings: settings.merge_songs
            ? null
            : (songSettings[s.id] ? { ...defaultSettings, ...songSettings[s.id] } : { ...defaultSettings, show_title: false }),
        };
      });

      const result = await api.generatePPT({
        slides,
        settings: settings as unknown as object,
        session_id: sessionId,
        songs: songs.map((s) => s.title),
        songs_data: songsWithSettings,
        merge_songs: settings.merge_songs,
        export_song_id: settings.merge_songs ? null : activeSongId,
      });

      setJob(result.job_id);

      const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
      saveProject({
        id: result.job_id,
        title: `${today}-찬양`,
        songs: songs.map((s) => s.title),
        createdAt: new Date().toISOString(),
      });

      router.push(`/done?job_id=${result.job_id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "PPT 생성 요청에 실패했습니다.");
      setGenerating(false);
    }
  };

  const Toggle = ({
    value,
    onChange,
    label,
    sub,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
    sub?: string;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={clsx(
          "w-10 h-5 rounded-full transition-colors relative flex-shrink-0",
          value ? "bg-accent" : "bg-border"
        )}
      >
        <div className={clsx(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          value ? "translate-x-5" : "translate-x-0.5"
        )} />
      </div>
      <span className="text-sm text-text-primary">{label}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </label>
  );

  const SettingsPanel = () => (
    <>
      {/* 슬라이드 옵션 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-3">슬라이드 옵션</h3>
        <div className="flex flex-col gap-3">
          <Toggle
            value={activeSettings.show_title}
            onChange={(v) => activeUpdate({ show_title: v })}
            label="제목 넣기"
            sub="(하단 오른쪽)"
          />
          {settings.merge_songs && (
            <Toggle
              value={settings.separator_slides}
              onChange={(v) => updateSettings({ separator_slides: v })}
              label="곡 사이 빈 슬라이드"
            />
          )}
        </div>
      </section>

      {/* 배경 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-3">배경</h3>
        <BackgroundPanel
          settings={activeSettings}
          onChange={activeUpdate}
          uploadedUrl={uploadedBgUrl}
          onUploadedUrlChange={setUploadedBgUrl}
          colorValue={bgColorValue}
          onColorChange={setBgColorValue}
        />
      </section>

      {/* 오버레이 투명도 */}
      {activeSettings.bg_type === "image" && (
        <section>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            오버레이 투명도{" "}
            <span className="text-text-muted font-normal">
              {Math.round(activeSettings.overlay_opacity * 100)}%
            </span>
          </h3>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={activeSettings.overlay_opacity}
            onChange={(e) => activeUpdate({ overlay_opacity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </section>
      )}

      {/* 폰트 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-2">폰트</h3>
        <select
          value={activeSettings.font_family}
          onChange={(e) => activeUpdate({ font_family: e.target.value })}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </section>

      {/* 폰트 크기 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          폰트 크기{" "}
          <span className="text-text-muted font-normal">{activeSettings.font_size}pt</span>
        </h3>
        <input
          type="range"
          min={20}
          max={60}
          step={2}
          value={activeSettings.font_size}
          onChange={(e) => activeUpdate({ font_size: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>20pt</span>
          <span>60pt</span>
        </div>
      </section>

      {/* 글자색 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-2">글자색</h3>
        <ColorPicker
          value={activeSettings.font_color || "#ffffff"}
          onChange={(hex) => activeUpdate({ font_color: hex })}
        />
      </section>

      {/* 텍스트 위치 */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-2">텍스트 위치</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "상단", y: 30 },
            { label: "중앙", y: 50 },
            { label: "하단", y: 70 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => activeUpdate({ text_position: { x: 50, y: preset.y } })}
              className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                activeSettings.text_position.y === preset.y
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:border-[#555]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header step={3} />

      {/* 전체화면 모달 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPreviewIndex((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1));
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {/* 슬라이드 — 화면 꽉 채움 */}
          <div className="w-full h-full">
            {activeItem?.type === "separator" ? (
              <div
                className="w-full h-full flex items-center justify-center relative overflow-hidden"
                style={{
                  ...(activeSettings.bg_type === "black" ? { backgroundColor: "#000" }
                    : activeSettings.bg_type === "color" && activeSettings.bg_value ? { backgroundColor: activeSettings.bg_value }
                    : activeSettings.bg_type === "image" && activeSettings.bg_value ? { backgroundImage: `url(${activeSettings.bg_value})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundColor: "#000" }),
                }}
              >
                {activeSettings.bg_type === "image" && activeSettings.overlay_opacity > 0 && (
                  <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${activeSettings.overlay_opacity})` }} />
                )}
                <span className="relative text-white/40 text-sm">빈 슬라이드 (곡 구분)</span>
              </div>
            ) : (
              <SlidePreview
                lyrics={activePreviewLyrics}
                songTitle={activePreviewTitle}
                settings={activeSettings}
                onPositionChange={(x, y) => activeUpdate({ text_position: { x, y } })}
                fullscreen
              />
            )}
          </div>

          {/* 오버레이 UI — hover 시 표시 */}
          <div className="absolute inset-0 flex flex-col pointer-events-none group">
            {/* 상단 바 */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
              <span className="text-sm text-white/70">{safeIndex + 1} / {previewItems.length}</span>
              <button
                onClick={() => { setFullscreen(false); document.exitFullscreen?.(); }}
                className="text-white/70 hover:text-white p-1"
              >
                <X size={22} />
              </button>
            </div>

            {/* 좌우 화살표 */}
            <div className="flex-1 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
              <button
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
                className="text-white/60 hover:text-white disabled:opacity-10 bg-black/30 rounded-full p-2"
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={() => setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1))}
                disabled={safeIndex >= previewItems.length - 1}
                className="text-white/60 hover:text-white disabled:opacity-10 bg-black/30 rounded-full p-2"
              >
                <ChevronRight size={40} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px - 73px)" }}>
        {/* 왼쪽: 미리보기 + 하단 썸네일 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 메인 프리뷰 영역 */}
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">슬라이드 미리보기</h2>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <button
                  onClick={() => setPreviewIndex(Math.max(0, safeIndex - 1))}
                  disabled={safeIndex === 0}
                  className="p-1 hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{safeIndex + 1} / {previewItems.length}</span>
                <button
                  onClick={() => setPreviewIndex(Math.min(previewItems.length - 1, safeIndex + 1))}
                  disabled={safeIndex >= previewItems.length - 1}
                  className="p-1 hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => {
                    setFullscreen(true);
                    document.documentElement.requestFullscreen?.();
                  }}
                  className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent transition-colors border border-accent/20"
                  title="전체화면 (F)"
                >
                  <Maximize2 size={18} />
                  <span className="text-xs font-medium">전체화면</span>
                </button>
              </div>
            </div>

            {activeItem?.type === "separator" ? (
              <div
                className="w-full rounded-lg flex items-center justify-center relative overflow-hidden"
                style={{
                  aspectRatio: "16/9",
                  ...(activeSettings.bg_type === "black" ? { backgroundColor: "#000" }
                    : activeSettings.bg_type === "color" && activeSettings.bg_value ? { backgroundColor: activeSettings.bg_value }
                    : activeSettings.bg_type === "image" && activeSettings.bg_value ? { backgroundImage: `url(${activeSettings.bg_value})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundColor: "#000" }),
                  boxShadow: "0 0 0 2px #555, 0 8px 32px rgba(0,0,0,0.7)",
                }}
              >
                {activeSettings.bg_type === "image" && activeSettings.overlay_opacity > 0 && (
                  <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${activeSettings.overlay_opacity})` }} />
                )}
                <span className="relative text-white/40 text-sm">빈 슬라이드 (곡 구분)</span>
              </div>
            ) : (
              <SlidePreview
                lyrics={activePreviewLyrics}
                songTitle={activePreviewTitle}
                settings={activeSettings}
                onPositionChange={(x, y) => activeUpdate({ text_position: { x, y } })}
              />
            )}

            <p className="text-xs text-text-muted text-center">
              텍스트 박스를 드래그해서 위치를 조정하세요. 가이드라인에 스냅됩니다.
            </p>
          </div>

          {/* 하단 슬라이드 썸네일 바 */}
          <ThumbnailStrip
            previewItems={previewItems}
            safeIndex={safeIndex}
            activeSettings={activeSettings}
            onSelect={setPreviewIndex}
          />
        </div>

        {/* 오른쪽: 설정 패널 */}
        <div className="w-80 border-l border-border bg-bg-sub overflow-y-auto p-5 flex flex-col gap-5">

          {/* 출력 방식 */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3">출력 방식</h3>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => handleMergeToggle(true)}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  settings.merge_songs ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
                )}
              >
                모든 곡 함께
              </button>
              <button
                onClick={() => handleMergeToggle(false)}
                className={clsx(
                  "flex-1 py-2 text-sm font-medium transition-colors border-l border-border",
                  !settings.merge_songs ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
                )}
              >
                곡별 따로
              </button>
            </div>

            {!settings.merge_songs && (
              <div className="mt-2 flex flex-col gap-1">
                {songs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleExportSongChange(song.id)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border",
                      activeSongId === song.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-primary hover:bg-card"
                    )}
                  >
                    {song.title}
                    {song.artist && (
                      <span className="text-xs text-text-muted ml-2">{song.artist}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {!settings.merge_songs && (
            <div className="border-t border-border -mx-5 px-5 pt-1">
              <p className="text-xs text-text-muted mb-1">
                {songs.find((s) => s.id === activeSongId)?.title ?? ""} 설정
              </p>
            </div>
          )}

          <SettingsPanel />
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="border-t border-border bg-bg-sub px-6 py-4 flex justify-between">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push("/editor/step2?mode=slides")}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          이전
        </Button>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating || slides.length === 0}
          className="gap-2"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              PPT 생성
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
