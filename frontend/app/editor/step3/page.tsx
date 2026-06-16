"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { SlidePreview } from "@/components/editor/SlidePreview";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { ColorPicker } from "@/components/editor/ColorPicker";
import { usePPTStore, defaultSettings, PPTSettings, Slide } from "@/store/pptStore";
import { api } from "@/lib/api";
import { saveProject, getOrCreateSessionId } from "@/lib/localStorage";
import {
  ArrowLeft,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Settings2,
  ChevronUp,
  Loader2,
  Monitor,
  Layers,
  RotateCcw,
} from "lucide-react";

type Step3Snapshot = {
  slides: Slide[];
  settings: PPTSettings;
  songSettings: Record<string, PPTSettings>;
};

const FONTS = [
  { value: "NanumGothic", label: "나눔고딕" },
  { value: "NanumMyeongjo", label: "나눔명조" },
  { value: "NanumSquare", label: "나눔스퀘어" },
  { value: "NotoSansKR", label: "Noto Sans KR" },
  { value: "ATitleGothic1", label: "a타이틀고딕1" },
  { value: "ATitleGothic2", label: "a타이틀고딕2" },
  { value: "ATitleGothic3", label: "a타이틀고딕3" },
];

const GOOGLE_FONTS: Record<string, string> = {
  NanumGothic: "'Nanum Gothic', sans-serif",
  NanumMyeongjo: "'Nanum Myeongjo', serif",
  NanumSquare: "'Nanum Square', sans-serif",
  NotoSansKR: "'Noto Sans KR', sans-serif",
  ATitleGothic1: "'ATitleGothic1', sans-serif",
  ATitleGothic2: "'ATitleGothic2', sans-serif",
  ATitleGothic3: "'ATitleGothic3', sans-serif",
};

type PreviewItem =
  | { type: "slide"; slide: Slide; songTitle?: string; settings: PPTSettings }
  | { type: "separator"; settings: PPTSettings };

const THUMBNAIL_OUTER_WIDTH = 104;
const THUMBNAIL_SCALE = 0.25;
const THUMBNAIL_INNER_WIDTH = THUMBNAIL_OUTER_WIDTH / THUMBNAIL_SCALE;
const THUMBNAIL_INNER_HEIGHT = THUMBNAIL_INNER_WIDTH * (9 / 16);
const THUMBNAIL_OUTER_HEIGHT = THUMBNAIL_INNER_HEIGHT * THUMBNAIL_SCALE;

// ── 썸네일 ──────────────────────────────────────────────
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
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 group transition-transform duration-200"
      style={{ transform: active ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)" }}
    >
      <div
        className="relative overflow-hidden transition-all"
        style={{
          width: THUMBNAIL_OUTER_WIDTH,
          height: THUMBNAIL_OUTER_HEIGHT,
          borderRadius: 8,
          outline: active ? "3px solid #2E5E3E" : "1px solid rgba(216,235,208,0.9)",
          outlineOffset: active ? 0 : -1,
          boxShadow: active
            ? "0 14px 26px rgba(25,56,36,0.32), 0 0 0 4px rgba(46,94,62,0.14)"
            : "0 4px 10px rgba(0,0,0,0.12)",
          background: "#fff",
        }}
      >
        {active && (
          <>
            <div
              className="absolute inset-x-0 top-0 z-20 h-1.5"
              style={{ background: "linear-gradient(90deg, #7FD39A 0%, #2E5E3E 100%)" }}
            />
            <div
              className="absolute right-1.5 top-1.5 z-20 rounded-full px-1.5 py-0.5 text-[8px] font-bold tracking-[0.18em] text-white"
              style={{ background: "rgba(25,56,36,0.84)" }}
            >
              NOW
            </div>
          </>
        )}
        <div
          style={{
            width: THUMBNAIL_INNER_WIDTH,
            height: THUMBNAIL_INNER_HEIGHT,
            transform: `scale(${THUMBNAIL_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <SlidePreview
            lyrics={isEmpty ? "" : slide?.lyrics ?? ""}
            songTitle={!isEmpty ? songTitle : undefined}
            settings={settings}
            onPositionChange={() => {}}
            thumbnail
          />
        </div>
      </div>
      <span
        className="text-[10px] font-mono tabular-nums transition-all"
        style={{
          color: active ? "#173620" : "#86C59A",
          fontWeight: active ? 800 : 600,
          letterSpacing: active ? "0.08em" : "0.04em",
          background: active ? "rgba(46,94,62,0.12)" : "transparent",
          borderRadius: 999,
          padding: active ? "2px 8px" : "0px",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </button>
  );
}

function SeparatorThumbnail({
  index,
  active,
  onClick,
  settings,
}: {
  index: number;
  active: boolean;
  onClick: () => void;
  settings: PPTSettings;
}) {
  const bgStyle: React.CSSProperties =
    settings.bg_type === "color" && settings.bg_value
      ? { backgroundColor: settings.bg_value }
      : settings.bg_type === "image" && settings.bg_value
      ? { backgroundImage: `url(${settings.bg_value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { backgroundColor: "#000" };

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 group transition-transform duration-200"
      style={{ transform: active ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)" }}
    >
      <div
        className="relative overflow-hidden flex items-center justify-center transition-all"
        style={{
          width: THUMBNAIL_OUTER_WIDTH,
          height: THUMBNAIL_OUTER_HEIGHT,
          ...bgStyle,
          borderRadius: 8,
          outline: active ? "3px solid #2E5E3E" : "2px dashed #86C59A",
          boxShadow: active
            ? "0 14px 26px rgba(25,56,36,0.28), 0 0 0 4px rgba(46,94,62,0.14)"
            : "0 4px 10px rgba(0,0,0,0.12)",
        }}
      >
        {active && (
          <div
            className="absolute inset-x-0 top-0 z-20 h-1.5"
            style={{ background: "linear-gradient(90deg, #7FD39A 0%, #2E5E3E 100%)" }}
          />
        )}
        {settings.bg_type === "image" && settings.overlay_opacity > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${settings.overlay_opacity})` }} />
        )}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
        <div className="relative flex flex-col items-center gap-1">
          <span className="text-[9px] font-semibold tracking-wide text-white/90">곡 구분</span>
          <span className="text-[7px] font-medium text-white/65">빈 슬라이드</span>
        </div>
      </div>
      <span
        className="text-[10px] font-mono tabular-nums transition-all"
        style={{
          color: active ? "#173620" : "#86C59A",
          fontWeight: active ? 800 : 600,
          letterSpacing: active ? "0.08em" : "0.04em",
          background: active ? "rgba(46,94,62,0.12)" : "transparent",
          borderRadius: 999,
          padding: active ? "2px 8px" : "0px",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </button>
  );
}

function ThumbnailStrip({
  previewItems,
  safeIndex,
  onSelect,
}: {
  previewItems: PreviewItem[];
  safeIndex: number;
  onSelect: (i: number) => void;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [safeIndex]);

  return (
    <div
      className="flex-shrink-0 px-4 py-4 flex gap-3 overflow-x-auto"
      style={{
        borderTop: "1px solid #D8EBD0",
        background: "linear-gradient(180deg, #FCFEFA 0%, #F2F8EE 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
        scrollbarWidth: "thin",
        scrollbarColor: "#D8EBD0 transparent",
      }}
    >
      {previewItems.map((item, i) => (
        <div key={i} ref={safeIndex === i ? activeRef : undefined} className="flex-shrink-0">
          {item.type === "separator" ? (
            <SeparatorThumbnail
              index={i}
              active={safeIndex === i}
              onClick={() => onSelect(i)}
              settings={item.settings}
            />
          ) : (
            <SlideThumbnail
              slide={item.slide}
              settings={item.settings}
              songTitle={item.songTitle}
              index={i}
              active={safeIndex === i}
              onClick={() => onSelect(i)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 섹션 헤더 ──────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
      {children}
    </p>
  );
}

// ── 토글 ───────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  label,
  sub,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 cursor-pointer py-0.5"
      onClick={() => onChange(!value)}
    >
      <div>
        <span className="text-sm font-medium select-none" style={{ color: "#1a3824" }}>{label}</span>
        {sub && <span className="text-xs ml-1.5 select-none" style={{ color: "#86C59A" }}>{sub}</span>}
      </div>
      <div
        className="relative flex-shrink-0 transition-colors"
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: value ? "#2E5E3E" : "#D8EBD0",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? "translateX(17px)" : "translateX(2px)" }}
        />
      </div>
    </div>
  );
}

// ── 설정 패널 내용 ──────────────────────────────────────
function SettingsContent({
  activeSettings,
  settings,
  activeUpdate,
  updateSettings,
  uploadedBgUrl,
  setUploadedBgUrl,
  bgColorValue,
  setBgColorValue,
  canRestoreCurrentSlide,
  onRestoreCurrentSlide,
  onShowTitleChange,
}: {
  activeSettings: PPTSettings;
  settings: PPTSettings;
  activeUpdate: (patch: Partial<PPTSettings>) => void;
  updateSettings: (patch: Partial<PPTSettings>) => void;
  uploadedBgUrl: string | null;
  setUploadedBgUrl: (url: string) => void;
  bgColorValue: string;
  setBgColorValue: (c: string) => void;
  canRestoreCurrentSlide: boolean;
  onRestoreCurrentSlide: () => void;
  onShowTitleChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* 슬라이드 옵션 */}
      <div>
        <SectionLabel>슬라이드 옵션</SectionLabel>
        <div className="flex flex-col gap-2 px-1">
          <Toggle
            value={activeSettings.show_title}
            onChange={onShowTitleChange}
            label="제목 넣기"
            sub="하단 오른쪽"
          />
          {settings.merge_songs && (
            <Toggle
              value={settings.separator_slides}
              onChange={(v) => updateSettings({ separator_slides: v })}
              label="곡 사이 빈 슬라이드"
            />
          )}
        </div>
      </div>

      <div>
        <SectionLabel>현재 슬라이드</SectionLabel>
        <button
          onClick={onRestoreCurrentSlide}
          disabled={!canRestoreCurrentSlide}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
          style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
        >
          <RotateCcw size={13} />
          가사 되돌리기
        </button>
      </div>

      {/* 배경 */}
      <div>
        <SectionLabel>배경</SectionLabel>
        <BackgroundPanel
          settings={activeSettings}
          onChange={activeUpdate}
          uploadedUrl={uploadedBgUrl}
          onUploadedUrlChange={setUploadedBgUrl}
          colorValue={bgColorValue}
          onColorChange={setBgColorValue}
        />
      </div>

      {/* 오버레이 */}
      {activeSettings.bg_type === "image" && (
        <div>
          <SectionLabel>
            오버레이 투명도
            <span className="normal-case font-normal text-[11px] ml-1" style={{ color: "#5BAA72" }}>
              {Math.round(activeSettings.overlay_opacity * 100)}%
            </span>
          </SectionLabel>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={activeSettings.overlay_opacity}
            onChange={(e) => activeUpdate({ overlay_opacity: parseFloat(e.target.value) })}
            className="w-full accent-[#2E5E3E]"
          />
        </div>
      )}

      {/* 폰트 */}
      <div>
        <SectionLabel>폰트</SectionLabel>
        <select
          value={activeSettings.font_family}
          onChange={(e) => activeUpdate({ font_family: e.target.value })}
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
          style={{
            background: "#F2F7F0",
            border: "1px solid #D8EBD0",
            color: "#1a3824",
          }}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* 폰트 크기 */}
      <div>
        <SectionLabel>
          폰트 크기
          <span className="normal-case font-normal text-[11px] ml-1" style={{ color: "#5BAA72" }}>
            {activeSettings.font_size}pt
          </span>
        </SectionLabel>
        <input
          type="range"
          min={20}
          max={60}
          step={2}
          value={activeSettings.font_size}
          onChange={(e) => activeUpdate({ font_size: parseInt(e.target.value) })}
          className="w-full accent-[#2E5E3E]"
        />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: "#B8DBBF" }}>
          <span>20pt</span>
          <span>60pt</span>
        </div>
      </div>

      {/* 글자색 */}
      <div>
        <SectionLabel>글자색</SectionLabel>
        <ColorPicker
          value={activeSettings.font_color || "#ffffff"}
          onChange={(hex) => activeUpdate({ font_color: hex })}
        />
      </div>

      {/* 텍스트 위치 */}
      <div>
        <SectionLabel>텍스트 위치</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "상단", y: 30 },
            { label: "중앙", y: 50 },
            { label: "하단", y: 70 },
          ].map((preset) => {
            const active = activeSettings.text_position.y === preset.y;
            return (
              <button
                key={preset.label}
                onClick={() => activeUpdate({ text_position: { x: 50, y: preset.y } })}
                className="py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: active ? "rgba(46,94,62,0.08)" : "transparent",
                  border: `1px solid ${active ? "#2E5E3E" : "#D8EBD0"}`,
                  color: active ? "#2E5E3E" : "#86C59A",
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────
export default function Step3() {
  const router = useRouter();
  const { slides, settings, updateSettings, songSettings, updateSongSettings, songs, slidesPerSong, setSlides, setSlidesForSong, setJob } =
    usePPTStore();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(
    settings.bg_type === "image" && !settings.bg_value?.includes("unsplash") ? settings.bg_value : null
  );
  const [bgColorValue, setBgColorValue] = useState<string>(
    settings.bg_type === "color" && settings.bg_value ? settings.bg_value : "#1a1a40"
  );
  const originalSlideLyricsRef = useRef<Record<string, string>>(
    Object.fromEntries(slides.map((slide) => [`${slide.song_id ?? "none"}:${slide.order}`, slide.lyrics]))
  );
  const originalGlobalBoxWidthRef = useRef(settings.text_box_width ?? defaultSettings.text_box_width);
  const originalSongBoxWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries(
      songs.map((song) => [
        song.id,
        (songSettings[song.id]?.text_box_width ?? defaultSettings.text_box_width),
      ])
    )
  );
  const historyRef = useRef<Step3Snapshot[]>([]);
  const restoringRef = useRef(false);

  function cloneSettingsValue(source: PPTSettings): PPTSettings {
    return {
      ...source,
      text_position: { ...source.text_position },
      title_position: { ...source.title_position },
    };
  }

  function createSnapshot(): Step3Snapshot {
    return {
      slides: slides.map((slide) => ({ ...slide })),
      settings: cloneSettingsValue(settings),
      songSettings: Object.fromEntries(
        Object.entries(songSettings).map(([songId, songSetting]) => [songId, cloneSettingsValue(songSetting)])
      ),
    };
  }

  function snapshotsEqual(a: Step3Snapshot, b: Step3Snapshot) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function pushHistorySnapshot() {
    if (restoringRef.current) return;
    const snapshot = createSnapshot();
    const lastSnapshot = historyRef.current[historyRef.current.length - 1];
    if (lastSnapshot && snapshotsEqual(lastSnapshot, snapshot)) return;
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 10) historyRef.current.shift();
  }

  function restoreSnapshot(snapshot: Step3Snapshot) {
    restoringRef.current = true;
    setSlides(snapshot.slides.map((slide) => ({ ...slide })));
    updateSettings(cloneSettingsValue(snapshot.settings));
    const snapshotSongIds = new Set(Object.keys(snapshot.songSettings));
    for (const songId of Object.keys(songSettings)) {
      if (!snapshotSongIds.has(songId)) {
        updateSongSettings(songId, { ...defaultSettings, show_title: false });
      }
    }
    for (const [songId, songSetting] of Object.entries(snapshot.songSettings)) {
      updateSongSettings(songId, cloneSettingsValue(songSetting));
    }
    for (const song of songs) {
      const songSlides = snapshot.slides
        .filter((slide) => slide.song_id === song.id)
        .sort((a, b) => a.order - b.order)
        .map((slide, index) => ({
          order: index + 1,
          lyrics: slide.lyrics,
          song_id: slide.song_id,
        }));
      setSlidesForSong(song.id, songSlides);
    }
    restoringRef.current = false;
  }

  function undoStep3() {
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;
    restoreSnapshot(snapshot);
  }

  const activeSongId = settings.merge_songs ? null : (settings.export_song_id ?? songs[0]?.id ?? null);

  const activeSettings: PPTSettings = settings.merge_songs
    ? settings
    : activeSongId
    ? (songSettings[activeSongId] ?? { ...defaultSettings, show_title: false })
    : settings;

  const activeUpdate = (patch: Partial<PPTSettings>, options?: { skipHistory?: boolean }) => {
    if (!options?.skipHistory) pushHistorySnapshot();
    if (settings.merge_songs) updateSettings(patch);
    else if (activeSongId) updateSongSettings(activeSongId, patch);
  };
  const trackedUpdateSettings = (patch: Partial<PPTSettings>) => {
    pushHistorySnapshot();
    updateSettings(patch);
  };

  const handleShowTitleChange = (value: boolean) => {
    pushHistorySnapshot();
    if (!value) {
      activeUpdate({ show_title: false }, { skipHistory: true });
      return;
    }

    if (!settings.merge_songs) {
      activeUpdate({ show_title: true, title_position: { ...defaultSettings.title_position } }, { skipHistory: true });
      return;
    }

    activeUpdate({ show_title: true }, { skipHistory: true });
  };

  const previewItems: PreviewItem[] = (() => {
    if (!settings.merge_songs) {
      const songTitle = songs.find((s) => s.id === activeSongId)?.title;
      return slides
        .filter((s) => s.song_id === activeSongId)
        .map((s) => ({ type: "slide" as const, slide: s, songTitle, settings: activeSettings }));
    }
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
      return slides.map((s) => ({ type: "slide" as const, slide: s, settings }));
    }
    const items: PreviewItem[] = [];
    songIds.forEach((sid, i) => {
      const songTitle = songs.find((s) => s.id === sid)?.title;
      (grouped[sid] ?? []).forEach((s) => items.push({ type: "slide", slide: s, songTitle, settings }));
      if (settings.separator_slides && i < songIds.length - 1) items.push({ type: "separator", settings });
    });
    return items;
  })();

  const safeIndex = Math.min(Math.max(previewIndex, 0), Math.max(previewItems.length - 1, 0));
  const activeItem = previewItems[safeIndex] ?? previewItems[0];
  const activePreviewLyrics = activeItem?.type === "slide" ? activeItem.slide.lyrics : "";
  const activePreviewTitle = (() => {
    if (activeItem?.type !== "slide" || !activeSettings.show_title) return undefined;
    if (settings.merge_songs) return activeItem.songTitle;
    return songs.find((s) => s.id === activeSongId)?.title;
  })();
  const activeSlideKey = activeItem?.type === "slide"
    ? `${activeItem.slide.song_id ?? "none"}:${activeItem.slide.order}`
    : null;
  const canRestoreCurrentSlide = activeItem?.type === "slide";

  function syncSlidesState(nextSlides: Slide[]) {
    setSlides(nextSlides);
    for (const song of songs) {
      const songSlides = nextSlides
        .filter((slide) => slide.song_id === song.id)
        .sort((a, b) => a.order - b.order)
        .map((slide, index) => ({
          order: index + 1,
          lyrics: slide.lyrics,
          song_id: slide.song_id,
        }));
      setSlidesForSong(song.id, songSlides);
    }
  }

  function handleSlideLyricsChange(text: string) {
    if (activeItem?.type !== "slide") return;
    const nextSlides = slides.map((slide) =>
      slide.order === activeItem.slide.order && slide.song_id === activeItem.slide.song_id
        ? { ...slide, lyrics: text }
        : slide
    );
    syncSlidesState(nextSlides);
  }

  function handleRestoreCurrentSlide() {
    if (activeItem?.type !== "slide" || !activeSlideKey) return;
    pushHistorySnapshot();
    const originalLyrics = originalSlideLyricsRef.current[activeSlideKey] ?? activeItem.slide.lyrics;
    handleSlideLyricsChange(originalLyrics);

    if (settings.merge_songs) {
      updateSettings({ text_box_width: originalGlobalBoxWidthRef.current });
    } else if (activeSongId) {
      updateSongSettings(activeSongId, {
        text_box_width: originalSongBoxWidthsRef.current[activeSongId] ?? defaultSettings.text_box_width,
      });
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1));
    else setPreviewIndex((i) => Math.max(0, i - 1));
  }, [previewItems.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoStep3();
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "ArrowLeft") setPreviewIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1));
    },
    [previewItems.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleMergeToggle = (merged: boolean) => {
    pushHistorySnapshot();
    updateSettings({
      merge_songs: merged,
      show_title: merged ? true : settings.show_title,
      export_song_id: merged ? null : (settings.export_song_id ?? songs[0]?.id ?? null),
    });
    setPreviewIndex(0);
  };

  const handleExportSongChange = (songId: string) => {
    pushHistorySnapshot();
    updateSettings({ export_song_id: songId });
    setPreviewIndex(0);
  };

  const handleGenerate = async () => {
    if (slides.length === 0) return;
    setGenerating(true);
    try {
      const sessionId = getOrCreateSessionId();
      const songsWithSettings = songs.map((s) => {
        const slideJoined = (slidesPerSong[s.id] ?? []).map((sl) => sl.lyrics).filter(Boolean).join("\n");
        return {
          id: s.id,
          title: s.title,
          lyrics: slideJoined || s.lyrics || null,
          artist: s.artist || null,
          source: s.source || null,
          settings: settings.merge_songs
            ? null
            : songSettings[s.id]
            ? { ...defaultSettings, ...songSettings[s.id] }
            : { ...defaultSettings, show_title: false },
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
      saveProject({ id: result.job_id, title: `${today}-찬양`, songs: songs.map((s) => s.title), createdAt: new Date().toISOString() });
      router.push(`/done?job_id=${result.job_id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "PPT 생성 요청에 실패했습니다.");
      setGenerating(false);
    }
  };

  // 빈 슬라이드 프리뷰 공통
  const SeparatorPreview = ({ fullscreenMode }: { fullscreenMode?: boolean }) => {
    const style: React.CSSProperties =
      activeSettings.bg_type === "black"
        ? { backgroundColor: "#000" }
        : activeSettings.bg_type === "color" && activeSettings.bg_value
        ? { backgroundColor: activeSettings.bg_value }
        : activeSettings.bg_type === "image" && activeSettings.bg_value
        ? { backgroundImage: `url(${activeSettings.bg_value})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { backgroundColor: "#000" };
    return (
      <div
        className="w-full flex items-center justify-center relative overflow-hidden"
        style={{
          aspectRatio: "16/9",
          ...style,
          borderRadius: fullscreenMode ? 0 : 12,
          boxShadow: fullscreenMode ? "none" : "0 8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {activeSettings.bg_type === "image" && activeSettings.overlay_opacity > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${activeSettings.overlay_opacity})` }} />
        )}
        <span className="relative text-white/30 text-sm font-medium">빈 슬라이드 (곡 구분)</span>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#F2F7F0" }}>
      <Header step={3} />

      {/* 전체화면 오버레이 */}
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
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full" style={{ aspectRatio: "16/9", maxHeight: "100vh", maxWidth: "calc(100vh * 16 / 9)" }}>
              {activeItem?.type === "separator" ? (
                <SeparatorPreview fullscreenMode />
              ) : (
                <SlidePreview
                  lyrics={activePreviewLyrics}
                  songTitle={activePreviewTitle}
                  settings={activeSettings}
                  onPositionChange={(x, y) => activeUpdate({ text_position: { x, y } }, { skipHistory: true })}
                  onTitlePositionChange={(x, y) => activeUpdate({ title_position: { x, y } }, { skipHistory: true })}
                  fullscreen
                />
              )}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col pointer-events-none group">
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
              <span className="text-sm font-medium text-white/60">{safeIndex + 1} / {previewItems.length}</span>
              <button
                onClick={() => { setFullscreen(false); document.exitFullscreen?.(); }}
                className="text-white/60 hover:text-white p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
              <button
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
                className="text-white/50 hover:text-white disabled:opacity-10 bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
              >
                <ChevronLeft size={36} />
              </button>
              <button
                onClick={() => setPreviewIndex((i) => Math.min(previewItems.length - 1, i + 1))}
                disabled={safeIndex >= previewItems.length - 1}
                className="text-white/50 hover:text-white disabled:opacity-10 bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
              >
                <ChevronRight size={36} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 레이아웃 */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* 미리보기 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "#F2F7F0" }}>

          {/* 미리보기 헤더 */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3"
            style={{ background: "white", borderBottom: "1px solid #D8EBD0" }}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} style={{ color: "#86C59A" }} />
              <span className="text-sm font-semibold" style={{ color: "#1a3824" }}>슬라이드 미리보기</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewIndex(Math.max(0, safeIndex - 1))}
                disabled={safeIndex === 0}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ color: "#5BAA72" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-mono tabular-nums px-1" style={{ color: "#86C59A" }}>
                {String(safeIndex + 1).padStart(2, "0")} / {String(previewItems.length).padStart(2, "0")}
              </span>
              <button
                onClick={() => setPreviewIndex(Math.min(previewItems.length - 1, safeIndex + 1))}
                disabled={safeIndex >= previewItems.length - 1}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ color: "#5BAA72" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => { setFullscreen(true); document.documentElement.requestFullscreen?.(); }}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E", border: "1px solid rgba(46,94,62,0.15)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46,94,62,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(46,94,62,0.08)"; }}
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* 슬라이드 프리뷰 */}
          <div
            className="flex-1 flex items-center justify-center px-3 sm:px-6 pt-3 sm:pt-4 pb-2 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-full max-w-3xl">
              {activeItem?.type === "separator" ? (
                <SeparatorPreview />
              ) : (
                <SlidePreview
                  lyrics={activePreviewLyrics}
                  songTitle={activePreviewTitle}
                  settings={activeSettings}
                  onPositionChange={(x, y) => activeUpdate({ text_position: { x, y } }, { skipHistory: true })}
                  onTitlePositionChange={(x, y) => activeUpdate({ title_position: { x, y } }, { skipHistory: true })}
                  editable
                  onLyricsChange={handleSlideLyricsChange}
                  onLyricsEditStart={pushHistorySnapshot}
                  onTextDragStart={pushHistorySnapshot}
                  onTitleDragStart={pushHistorySnapshot}
                  onResizeStart={pushHistorySnapshot}
                  onTextBoxWidthChange={(width) => activeUpdate({ text_box_width: width }, { skipHistory: true })}
                />
              )}
            </div>
          </div>

          {/* 드래그 안내 */}
          <p className="flex-shrink-0 text-xs text-center pb-2 hidden lg:block" style={{ color: "#86C59A" }}>
            슬라이드 안에서 바로 가사를 수정하고, 위치 이동과 박스 너비를 조정하세요.
          </p>

          {/* 썸네일 스트립 — 데스크탑 전용 */}
          <div className="hidden lg:block">
            <ThumbnailStrip
              previewItems={previewItems}
              safeIndex={safeIndex}
              onSelect={setPreviewIndex}
            />
          </div>
        </div>

        {/* 우: 설정 패널 (데스크탑) */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 272, background: "white", borderLeft: "1px solid #D8EBD0" }}
        >
          {/* 출력 방식 */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #D8EBD0" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
              출력 방식
            </p>
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: "1px solid #D8EBD0", background: "#F2F7F0" }}
            >
              {[
                { label: "모든 곡 함께", icon: <Layers size={12} />, merged: true },
                { label: "곡별 따로", icon: <Monitor size={12} />, merged: false },
              ].map((opt) => {
                const active = settings.merge_songs === opt.merged;
                return (
                  <button
                    key={String(opt.merged)}
                    onClick={() => handleMergeToggle(opt.merged)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
                    style={{
                      background: active ? "#2E5E3E" : "transparent",
                      color: active ? "white" : "#86C59A",
                      borderRadius: active ? 10 : 0,
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {!settings.merge_songs && songs.length > 1 && (
              <div className="mt-2 flex flex-col gap-1">
                {songs.map((song) => {
                  const active = activeSongId === song.id;
                  return (
                    <button
                      key={song.id}
                      onClick={() => handleExportSongChange(song.id)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: active ? "rgba(46,94,62,0.07)" : "transparent",
                        border: `1px solid ${active ? "rgba(46,94,62,0.2)" : "#F2F7F0"}`,
                        color: active ? "#2E5E3E" : "#4a7a56",
                      }}
                    >
                      {song.title}
                      {song.artist && (
                        <span className="ml-1.5" style={{ color: "#86C59A", fontWeight: 400 }}>{song.artist}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!settings.merge_songs && (
              <p className="text-[10px] mt-2" style={{ color: "#B8DBBF" }}>
                {songs.find((s) => s.id === activeSongId)?.title ?? ""} 디자인 설정 중
              </p>
            )}
          </div>

          {/* 나머지 설정 */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <SettingsContent
              activeSettings={activeSettings}
              settings={settings}
              activeUpdate={activeUpdate}
              updateSettings={trackedUpdateSettings}
              uploadedBgUrl={uploadedBgUrl}
              setUploadedBgUrl={setUploadedBgUrl}
              bgColorValue={bgColorValue}
              setBgColorValue={setBgColorValue}
              canRestoreCurrentSlide={!!canRestoreCurrentSlide}
              onRestoreCurrentSlide={handleRestoreCurrentSlide}
              onShowTitleChange={handleShowTitleChange}
            />
          </div>
        </div>

      </main>

      {/* 모바일 전용 썸네일 스트립 — 설정 패널 닫혔을 때만 표시 */}
      <div className={`lg:hidden flex-shrink-0${settingsOpen ? " hidden" : ""}`}>
        <ThumbnailStrip
          previewItems={previewItems}
          safeIndex={safeIndex}
          onSelect={setPreviewIndex}
        />
      </div>

      {/* 모바일: 디자인 설정 패널 — main 바깥, 썸네일 아래 */}
      <div className="lg:hidden flex-shrink-0" style={{ background: "white", borderTop: "1px solid #D8EBD0" }}>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={14} style={{ color: "#2E5E3E" }} />
            <span className="text-sm font-semibold" style={{ color: "#1a3824" }}>디자인 설정</span>
          </div>
          <ChevronUp
            size={15}
            style={{
              color: "#86C59A",
              transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>
        {settingsOpen && (
          <div
            className="overflow-y-auto px-4 py-4 flex flex-col gap-5"
            style={{ background: "white", maxHeight: "40vh", borderTop: "1px solid #D8EBD0" }}
          >
            {/* 출력 방식 */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>출력 방식</p>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #D8EBD0", background: "#F2F7F0" }}>
                {[
                  { label: "모든 곡 함께", merged: true },
                  { label: "곡별 따로", merged: false },
                ].map((opt) => {
                  const active = settings.merge_songs === opt.merged;
                  return (
                    <button
                      key={String(opt.merged)}
                      onClick={() => handleMergeToggle(opt.merged)}
                      className="flex-1 py-2 text-xs font-semibold transition-all"
                      style={{
                        background: active ? "#2E5E3E" : "transparent",
                        color: active ? "white" : "#86C59A",
                        borderRadius: active ? 10 : 0,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {!settings.merge_songs && (
                <div className="mt-2 flex flex-col gap-1">
                  {songs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleExportSongChange(song.id)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: activeSongId === song.id ? "rgba(46,94,62,0.07)" : "transparent",
                        border: `1px solid ${activeSongId === song.id ? "rgba(46,94,62,0.2)" : "#F2F7F0"}`,
                        color: activeSongId === song.id ? "#2E5E3E" : "#4a7a56",
                      }}
                    >
                      {song.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
                  <SettingsContent
                    activeSettings={activeSettings}
                    settings={settings}
                    activeUpdate={activeUpdate}
                    updateSettings={trackedUpdateSettings}
                    uploadedBgUrl={uploadedBgUrl}
                    setUploadedBgUrl={setUploadedBgUrl}
                    bgColorValue={bgColorValue}
              setBgColorValue={setBgColorValue}
              canRestoreCurrentSlide={!!canRestoreCurrentSlide}
              onRestoreCurrentSlide={handleRestoreCurrentSlide}
              onShowTitleChange={handleShowTitleChange}
            />
          </div>
        )}
      </div>

      {/* 하단 버튼 바 */}
      <div
        className="flex-shrink-0 flex flex-row items-center justify-between gap-3 px-4 sm:px-5 py-4"
        style={{ background: "white", borderTop: "1px solid #D8EBD0" }}
      >
        <button
          onClick={() => router.push("/editor/step2")}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 sm:flex-none min-w-0"
          style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
        >
          <ArrowLeft size={15} />
          이전
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || slides.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex-1 sm:flex-none min-w-0"
          style={{ background: "#2E5E3E", boxShadow: slides.length > 0 && !generating ? "0 4px 16px rgba(46,94,62,0.25)" : "none" }}
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              PPT 생성 중...
            </>
          ) : (
            <>
              <Wand2 size={15} />
              PPT 생성
            </>
          )}
        </button>
      </div>
    </div>
  );
}
