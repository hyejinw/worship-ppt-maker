"use client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Header } from "@/components/ui/Header";
import { SlideCard } from "@/components/editor/SlideCard";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCw,
  Wand2,
  FileText,
  Music,
  AlertTriangle,
  RotateCcw,
  Copy,
  ListOrdered,
  AlignJustify,
  Sparkles,
  FileSearch,
} from "lucide-react";

type Mode = "lyrics" | "slides";

function useUndoHistory<T>(initial: T | (() => T)) {
  const [current, setCurrent] = useState<T>(initial as T);
  const history = useRef<T[]>([]);

  const set = useCallback((updater: (prev: T) => T) => {
    setCurrent((prev) => {
      history.current.push(prev);
      if (history.current.length > 100) history.current.shift();
      return updater(prev);
    });
  }, []);

  const replace = useCallback((updater: (prev: T) => T) => {
    setCurrent((prev) => updater(prev));
  }, []);

  const undo = useCallback((): T | undefined => {
    if (history.current.length === 0) return undefined;
    const prev = history.current.pop()!;
    setCurrent(prev);
    return prev;
  }, []);

  return { current, set, replace, undo };
}

function slidesFromRaw(text: string) {
  return text
    .split("//")
    .map((s, i) => ({ order: i + 1, lyrics: s.trim() }))
    .filter((s) => s.lyrics.length > 0);
}

function rawFromSlides(slides: { order: number; lyrics: string }[]) {
  return slides.map((s) => s.lyrics).join("\n//\n");
}

function useResizable(initialPx: number, min: number, max: number, direction: 1 | -1 = 1) {
  const [size, setSize] = useState(initialPx);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startSize = size;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(max, Math.max(min, startSize + direction * (ev.clientX - startX)));
      setSize(next);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, min, max, direction]);

  return { size, onMouseDown };
}

function Divider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 flex-shrink-0 cursor-col-resize transition-colors relative"
      style={{ background: "#D8EBD0" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,94,62,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#D8EBD0")}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

// 서비스 준비 중 토스트
function ComingSoonToast({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 1000);
    return () => clearTimeout(t);
  }, [visible, onHide]);

  if (!visible) return null;
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg"
      style={{ background: "#1a3824", color: "white" }}
    >
      <Loader2 size={14} className="animate-spin" style={{ color: "#86C59A" }} />
      서비스 준비 중이에요
    </div>
  );
}

// 탭바 우상단 초록 언덕 SVG 장식
function HillDecoration() {
  return (
    <div className="absolute top-0 right-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 220 }}>
      <svg viewBox="0 0 220 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMaxYMax slice">
        <ellipse cx="210" cy="55" rx="110" ry="48" fill="#D8EBD0" opacity="0.8" />
        <ellipse cx="190" cy="52" rx="90" ry="40" fill="#B8DBBF" opacity="0.6" />
        <ellipse cx="220" cy="50" rx="75" ry="36" fill="#86C59A" opacity="0.45" />
        <ellipse cx="200" cy="48" rx="55" ry="30" fill="#5BAA72" opacity="0.3" />
      </svg>
    </div>
  );
}

// 좌측 곡 사이드바
function SongSidebar({
  songs,
  activeSongIndex,
  setActiveSongIndex,
  slidesPerSong,
  showCount,
  width,
  onAddSong,
}: {
  songs: { id: string; title: string; artist: string }[];
  activeSongIndex: number;
  setActiveSongIndex: (i: number) => void;
  slidesPerSong: Record<string, { order: number; lyrics: string }[]>;
  showCount: boolean;
  width: number;
  onAddSong?: () => void;
}) {
  return (
    <div
      className="hidden sm:flex flex-shrink-0 flex-col"
      style={{ width, background: "white", borderRight: "1px solid #D8EBD0" }}
    >
      {/* 헤더 */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #D8EBD0" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#86C59A" }}>
          곡 목록
        </p>
        {onAddSong && (
          <button
            onClick={onAddSong}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E", border: "1px solid rgba(46,94,62,0.15)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46,94,62,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(46,94,62,0.08)"; }}
          >
            <Plus size={11} />
            추가
          </button>
        )}
      </div>

      {/* 곡 목록 */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {songs.map((song, i) => {
          const isActive = activeSongIndex === i;
          const count = showCount ? (slidesPerSong[song.id] ?? []).length : null;
          return (
            <button
              key={song.id}
              onClick={() => setActiveSongIndex(i)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group"
              style={{
                background: isActive ? "#2E5E3E" : "transparent",
                border: `1px solid ${isActive ? "transparent" : "transparent"}`,
                color: isActive ? "white" : "#1a3824",
              }}
            >
              <div className="flex items-center gap-2">
                <Music size={12} style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#86C59A", flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm">{song.title}</p>
                  {song.artist && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#86C59A" }}
                    >
                      {song.artist}
                    </p>
                  )}
                  {isActive && (
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      현재 편집 중
                    </p>
                  )}
                  {count !== null && !isActive && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#5BAA72" }}>{count}슬라이드</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* 곡 추가하기 카드 */}
        {onAddSong && (
          <button
            onClick={onAddSong}
            className="w-full text-left px-3 py-3 rounded-xl text-sm transition-all mt-1"
            style={{
              border: "1.5px dashed #D8EBD0",
              color: "#86C59A",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2E5E3E";
              e.currentTarget.style.color = "#2E5E3E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#D8EBD0";
              e.currentTarget.style.color = "#86C59A";
            }}
          >
            <div className="flex items-center gap-2">
              <Plus size={14} />
              <div>
                <p className="font-semibold text-xs">곡 추가하기</p>
                <p className="text-[10px] mt-0.5">다른 찬양을 추가하세요</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Tip */}
      <div
        className="mx-2 mb-2 px-3 py-3 rounded-xl"
        style={{ background: "#F2F7F0", border: "1px solid #D8EBD0" }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: "#5BAA72" }}>💡 Tip</p>
        <p className="text-xs leading-relaxed" style={{ color: "#86C59A" }}>
          가사를 클릭하면<br />수정할 수 있어요.
        </p>
      </div>
    </div>
  );
}

// 우측 패널 (준비 중 항목)
function RightPanel({
  song,
  onComingSoon,
}: {
  song: { title: string; artist: string; source?: string | null } | undefined;
  onComingSoon: () => void;
}) {
  const comingSoonItems = [
    { label: "가사 새로고침", icon: <RotateCcw size={13} /> },
    { label: "중복 제거", icon: <Copy size={13} /> },
    { label: "줄 번호 재정렬", icon: <ListOrdered size={13} /> },
    { label: "빈 줄 정리", icon: <AlignJustify size={13} /> },
  ];

  const aiItems = [
    {
      label: "AI 가사 정리",
      sub: "가사를 보기 좋게 정리해드려요",
      icon: <Sparkles size={14} style={{ color: "#2E5E3E" }} />,
      active: true,
    },
    {
      label: "키워드 요약",
      sub: "이 찬양의 핵심 메시지를 요약해요",
      icon: <FileSearch size={14} style={{ color: "#5BAA72" }} />,
      active: false,
    },
  ];

  const songInfo = song
    ? [
        { key: "아티스트", value: song.artist || "—" },
        { key: "앨범", value: "—" },
        { key: "장르", value: "—" },
        { key: "템포", value: "—" },
        { key: "키", value: "—" },
      ]
    : [];

  return (
    <div
      className="hidden sm:flex flex-col flex-shrink-0 overflow-y-auto"
      style={{ width: 220, background: "white", borderLeft: "1px solid #D8EBD0" }}
    >
      {/* 가사 관리 */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F2F7F0" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
          가사 관리
        </p>
        <div className="flex flex-col gap-0.5">
          {comingSoonItems.map((item) => (
            <button
              key={item.label}
              onClick={onComingSoon}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs transition-all w-full text-left"
              style={{ color: "#4a7a56" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: "#86C59A" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI 도우미 */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid #F2F7F0" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
          AI 도우미
        </p>
        <div className="flex flex-col gap-2">
          {aiItems.map((item) => (
            <button
              key={item.label}
              onClick={onComingSoon}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full transition-all"
              style={{
                background: item.active ? "rgba(46,94,62,0.06)" : "transparent",
                border: `1px solid ${item.active ? "rgba(46,94,62,0.12)" : "#F2F7F0"}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46,94,62,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = item.active ? "rgba(46,94,62,0.06)" : "transparent"; }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1a3824" }}>{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#86C59A" }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 곡 정보 */}
      {song && (
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
            곡 정보
          </p>
          <div className="flex flex-col gap-1.5">
            {songInfo.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <span className="text-[11px] w-14 flex-shrink-0" style={{ color: "#86C59A" }}>{row.key}</span>
                <span className="text-[11px] font-medium" style={{ color: "#1a3824" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 가사 편집기 — 줄번호 + textarea 스크롤 동기화
function LyricsEditor({
  songId,
  text,
  onChange,
  onUndo,
}: {
  songId: string;
  text: string;
  onChange: (t: string) => void;
  onUndo: () => void;
}) {
  const numRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lines = text.split("\n");

  const syncScroll = () => {
    if (numRef.current && taRef.current) {
      numRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* 줄 번호 열 */}
      <div
        ref={numRef}
        className="overflow-hidden flex-shrink-0 select-none py-5 pr-2 pl-4"
        style={{ background: 'white', width: 52 }}
      >
        {lines.map((_, i) => (
          <div
            key={i}
            className="font-mono text-[11px] text-right"
            style={{ color: '#B8DBBF', lineHeight: '1.625rem' }}
          >
            {String(i + 1).padStart(2, '0')}
          </div>
        ))}
      </div>
      {/* 편집 textarea */}
      <textarea
        ref={taRef}
        key={songId}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            onUndo();
          }
        }}
        className="flex-1 py-5 pr-6 text-sm resize-none focus:outline-none"
        style={{
          background: 'white',
          color: '#1a3824',
          lineHeight: '1.625rem',
          paddingLeft: 4,
          overflowY: 'auto',
        }}
        spellCheck={false}
        placeholder="가사를 입력하세요..."
      />
    </div>
  );
}

function Step2Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { songs, setSlides, slidesPerSong, setSlidesForSong, setRawText, setSongLyrics } = usePPTStore();

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("mode") === "slides" ? "slides" : "lyrics"
  );
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [slideIds, setSlideIds] = useState<Record<string, string[]>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);

  const showComingSoon = useCallback(() => {
    setComingSoonVisible(true);
  }, []);

  const lyricsHistory = useUndoHistory<Record<string, string>>(
    Object.fromEntries(songs.map((s) => [s.id, s.lyrics || ""]))
  );
  const editedLyrics = lyricsHistory.current;
  const setEditedLyrics = lyricsHistory.set;

  const rawHistory = useUndoHistory<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [songId, slides] of Object.entries(slidesPerSong)) {
      init[songId] = rawFromSlides(slides);
    }
    return init;
  });
  const rawTexts = rawHistory.current;
  const setRawTexts = rawHistory.set;
  const replaceRawTexts = rawHistory.replace;

  const sidebarLyrics = useResizable(220, 140, 400);
  const sidebarSlides = useResizable(220, 140, 400);
  const rightPanel = useResizable(340, 200, 560, -1);

  const prevSlidesPerSongRef = useRef(slidesPerSong);
  const editingRawSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevSlidesPerSongRef.current;
    const updated: Record<string, string> = {};
    let changed = false;
    for (const [songId, slides] of Object.entries(slidesPerSong)) {
      if (prev[songId] !== slides && songId !== editingRawSongIdRef.current) {
        updated[songId] = rawFromSlides(slides);
        changed = true;
      }
    }
    if (changed) replaceRawTexts((t) => ({ ...t, ...updated }));
    prevSlidesPerSongRef.current = slidesPerSong;
  }, [slidesPerSong]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleLyricsChange = (songId: string, text: string) => {
    setEditedLyrics((prev) => ({ ...prev, [songId]: text }));
    const song = songs.find((s) => s.id === songId);
    setSongLyrics(songId, text, song?.source ?? null);
  };

  const handleRunAI = useCallback(async () => {
    const emptySongs = songs.filter((s) => !editedLyrics[s.id]?.trim());
    if (emptySongs.length > 0) {
      const list = emptySongs.map((s) => `• ${s.title}`).join("\n");
      alert(`다음 곡의 가사가 비어 있어요:\n\n${list}\n\n가사를 입력한 후 다시 시도해주세요.`);
      setActiveSongIndex(songs.indexOf(emptySongs[0]));
      return;
    }

    setAiLoading(true);
    for (const song of songs) {
      const edited = editedLyrics[song.id];
      if (edited !== song.lyrics) setSongLyrics(song.id, edited, song.source);
    }

    try {
      const newSlidesPerSong: Record<string, { order: number; lyrics: string }[]> = {};
      const newSlideIds: Record<string, string[]> = {};
      const allSlides: { order: number; lyrics: string; song_id: string }[] = [];
      let globalOrder = 1;

      for (const song of songs) {
        const lyrics = editedLyrics[song.id];
        if (!lyrics?.trim()) continue;

        const result = await api.splitSlides(lyrics);
        const songSlides = result.slides.map((slide: { lyrics: string }, i: number) => ({
          order: i + 1,
          lyrics: slide.lyrics,
          song_id: song.id,
        }));

        newSlidesPerSong[song.id] = songSlides;
        newSlideIds[song.id] = songSlides.map((_: unknown, i: number) => `${song.id}-slide-${i}`);

        for (const slide of songSlides) {
          allSlides.push({ order: globalOrder++, lyrics: slide.lyrics, song_id: song.id });
        }
      }

      for (const [songId, songSlides] of Object.entries(newSlidesPerSong)) {
        setSlidesForSong(songId, songSlides);
      }
      setSlides(allSlides);
      setRawText(rawFromSlides(allSlides));
      setSlideIds(newSlideIds);
      setMode("slides");
    } catch (e) {
      console.error("AI 슬라이드 구분 실패:", e);
    } finally {
      setAiLoading(false);
    }
  }, [songs, editedLyrics, setSongLyrics, setSlidesForSong, setSlides, setRawText]);

  const handleRerunAI = useCallback(async (songId: string, lyrics: string) => {
    setAiLoading(true);
    try {
      const result = await api.splitSlides(lyrics);
      const songSlides = result.slides.map((slide: { lyrics: string }, i: number) => ({
        order: i + 1,
        lyrics: slide.lyrics,
      }));

      setSlidesForSong(songId, songSlides);
      setSlideIds((prev) => ({
        ...prev,
        [songId]: songSlides.map((_: unknown, i: number) => `${songId}-slide-${i}`),
      }));

      const allSlides: { order: number; lyrics: string; song_id: string }[] = [];
      let globalOrder = 1;
      for (const song of songs) {
        const perSong = song.id === songId ? songSlides : (slidesPerSong[song.id] ?? []);
        for (const slide of perSong) {
          allSlides.push({ order: globalOrder++, lyrics: slide.lyrics, song_id: song.id });
        }
      }
      setSlides(allSlides);
      setRawText(rawFromSlides(allSlides));
    } catch (e) {
      console.error("AI 재구분 실패:", e);
    } finally {
      setAiLoading(false);
    }
  }, [songs, slidesPerSong, setSlidesForSong, setSlides, setRawText]);

  const syncAllSlides = useCallback((updatedSongId: string, updatedSlides: { order: number; lyrics: string }[]) => {
    const allSlides: { order: number; lyrics: string; song_id: string }[] = [];
    let globalOrder = 1;
    for (const song of songs) {
      const perSong = song.id === updatedSongId ? updatedSlides : (slidesPerSong[song.id] ?? []);
      for (const slide of perSong) {
        allSlides.push({ order: globalOrder++, lyrics: slide.lyrics, song_id: song.id });
      }
    }
    setSlides(allSlides);
    setRawText(rawFromSlides(allSlides));
  }, [songs, slidesPerSong, setSlides, setRawText]);

  const handleRawTextChange = (songId: string, text: string) => {
    editingRawSongIdRef.current = songId;
    setRawTexts((prev) => ({ ...prev, [songId]: text }));
    const parsed = slidesFromRaw(text);
    setSlidesForSong(songId, parsed);
    setSlideIds((prev) => ({
      ...prev,
      [songId]: parsed.map((_, i) => `${songId}-slide-${i}`),
    }));
    syncAllSlides(songId, parsed);
    requestAnimationFrame(() => { editingRawSongIdRef.current = null; });
  };

  const handleDragEnd = (songId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = slideIds[songId] ?? [];
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const newIds = arrayMove(ids, oldIndex, newIndex);
    const currentSlides = slidesPerSong[songId] ?? [];
    const newSlides = newIds.map((id, i) => {
      const origIdx = ids.indexOf(id);
      return { ...currentSlides[origIdx], order: i + 1 };
    });
    setSlideIds((prev) => ({ ...prev, [songId]: newIds }));
    setSlidesForSong(songId, newSlides);
    syncAllSlides(songId, newSlides);
  };

  const handleRemoveSlide = (songId: string, index: number) => {
    const currentSlides = slidesPerSong[songId] ?? [];
    const newSlides = currentSlides
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSlidesForSong(songId, newSlides);
    setSlideIds((prev) => ({ ...prev, [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`) }));
    syncAllSlides(songId, newSlides);
  };

  const handleAddSlide = (songId: string) => {
    const currentSlides = slidesPerSong[songId] ?? [];
    const newSlides = [...currentSlides, { order: currentSlides.length + 1, lyrics: "" }];
    setSlidesForSong(songId, newSlides);
    setSlideIds((prev) => ({ ...prev, [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`) }));
    syncAllSlides(songId, newSlides);
  };

  const handleInsertSlide = (songId: string, index: number) => {
    const currentSlides = slidesPerSong[songId] ?? [];
    const newSlides = [
      ...currentSlides.slice(0, index),
      { order: 0, lyrics: "" },
      ...currentSlides.slice(index),
    ].map((s, i) => ({ ...s, order: i + 1 }));
    setSlidesForSong(songId, newSlides);
    setSlideIds((prev) => ({ ...prev, [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`) }));
    syncAllSlides(songId, newSlides);
  };

  const activeSong = songs[activeSongIndex];
  const totalSlides = Object.values(slidesPerSong).reduce((acc, s) => acc + s.length, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#F2F7F0" }}>
      <Header step={2} />

      <ComingSoonToast visible={comingSoonVisible} onHide={() => setComingSoonVisible(false)} />

      {/* Mode tabs */}
      <div
        className="flex items-center gap-0 px-6 relative overflow-hidden"
        style={{ background: "white", borderBottom: "1px solid #D8EBD0" }}
      >
        <HillDecoration />
        {[
          { key: "lyrics" as Mode, label: "가사 검토", icon: <FileText size={13} /> },
          { key: "slides" as Mode, label: "슬라이드 편집", icon: <Music size={13} />, count: totalSlides },
        ].map((tab) => {
          const isActive = mode === tab.key;
          const disabled = tab.key === "slides" && totalSlides === 0;
          return (
            <button
              key={tab.key}
              onClick={() => !disabled && setMode(tab.key)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-5 py-3 text-sm font-semibold transition-all border-b-2"
              style={{
                borderBottomColor: isActive ? "#2E5E3E" : "transparent",
                color: isActive ? "#2E5E3E" : disabled ? "#86C59A" : "#4a7a56",
                background: "transparent",
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(46,94,62,0.1)", color: "#2E5E3E" }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}

        {/* 모바일 곡 선택 버튼 */}
        {songs.length > 1 && (
          <button
            onClick={() => setShowSongList((v) => !v)}
            className="ml-auto sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E", border: "1px solid rgba(46,94,62,0.15)" }}
          >
            <Music size={12} />
            {activeSong?.title ?? "곡 선택"}
          </button>
        )}
      </div>

      {/* 모바일 곡 목록 */}
      {showSongList && (
        <div
          className="sm:hidden p-2 flex flex-col gap-1 z-10"
          style={{ background: "white", borderBottom: "1px solid #D8EBD0" }}
        >
          {songs.map((song, i) => (
            <button
              key={song.id}
              onClick={() => { setActiveSongIndex(i); setShowSongList(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: activeSongIndex === i ? "rgba(46,94,62,0.07)" : "transparent",
                border: `1px solid ${activeSongIndex === i ? "rgba(46,94,62,0.25)" : "#D8EBD0"}`,
                color: "#1a3824",
              }}
            >
              <p className="font-semibold">{song.title}</p>
              {song.artist && <p className="text-xs" style={{ color: "#86C59A" }}>{song.artist}</p>}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* ── 가사 검토 모드 ── */}
        {mode === "lyrics" && (
          <>
            <SongSidebar
              songs={songs}
              activeSongIndex={activeSongIndex}
              setActiveSongIndex={setActiveSongIndex}
              slidesPerSong={slidesPerSong}
              showCount={false}
              width={sidebarLyrics.size}
              onAddSong={showComingSoon}
            />
            <div className="hidden sm:block">
              <Divider onMouseDown={sidebarLyrics.onMouseDown} />
            </div>

            {/* 가운데: 가사 내용 */}
            <div className="flex-1 flex flex-col min-w-0 relative" style={{ background: "white" }}>

              {activeSong && (
                <>
                  {/* Song header */}
                  <div
                    className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between relative z-10"
                    style={{ borderBottom: "1px solid #F2F7F0" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold" style={{ color: "#1a3824" }}>
                        {activeSong.title}
                      </span>
                      {activeSong.artist && (
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E" }}
                        >
                          {activeSong.artist}
                        </span>
                      )}
                    </div>
                    {activeSong.source && activeSong.source !== "manual" && (
                      <div
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                      >
                        <AlertTriangle size={11} />
                        웹 수집 가사는 틀릴 수 있어요 — 직접 확인 후 수정해주세요
                      </div>
                    )}
                  </div>

                  {/* 가사 편집기 */}
                  <LyricsEditor
                    songId={activeSong.id}
                    text={editedLyrics[activeSong.id] ?? ""}
                    onChange={(t) => handleLyricsChange(activeSong.id, t)}
                    onUndo={() => {
                      const prev = lyricsHistory.undo();
                      if (prev) {
                        const text = prev[activeSong.id] ?? "";
                        const song = songs.find((s) => s.id === activeSong.id);
                        setSongLyrics(activeSong.id, text, song?.source ?? null);
                      }
                    }}
                  />
                </>
              )}
            </div>

            {/* 우측 패널 */}
            <div className="hidden sm:block">
              <Divider onMouseDown={rightPanel.onMouseDown} />
            </div>
            <RightPanel song={activeSong} onComingSoon={showComingSoon} />
          </>
        )}

        {/* ── 슬라이드 편집 모드 ── */}
        {mode === "slides" && (
          <>
            <SongSidebar
              songs={songs}
              activeSongIndex={activeSongIndex}
              setActiveSongIndex={setActiveSongIndex}
              slidesPerSong={slidesPerSong}
              showCount={true}
              width={sidebarSlides.size}
            />
            <div className="hidden sm:block">
              <Divider onMouseDown={sidebarSlides.onMouseDown} />
            </div>

            {activeSong && (
              <>
                {/* 가운데: 텍스트 에디터 */}
                <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: "1px solid #D8EBD0", background: "white" }}>
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: "1px solid #F2F7F0" }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold truncate block sm:inline" style={{ color: "#1a3824" }}>
                        {activeSong.title}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "#86C59A" }}>
                        <code style={{ color: "#2E5E3E", fontWeight: 600 }}>//</code>
                        {" "}로 슬라이드 구분
                      </span>
                    </div>
                    <button
                      onClick={() => handleRerunAI(activeSong.id, editedLyrics[activeSong.id] ?? "")}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ml-3 transition-all disabled:opacity-40"
                      style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
                    >
                      {aiLoading
                        ? <Loader2 size={12} className="animate-spin" />
                        : <RefreshCw size={12} />
                      }
                      <span className="hidden sm:inline">AI</span> 재구분
                    </button>
                  </div>

                  {aiLoading ? (
                    <div className="flex-1 flex items-center justify-center" style={{ background: "#F2F7F0" }}>
                      <div className="text-center">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                          style={{ background: "rgba(46,94,62,0.1)" }}
                        >
                          <Loader2 size={20} className="animate-spin" style={{ color: "#2E5E3E" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "#1a3824" }}>AI가 슬라이드를 구분하고 있습니다...</p>
                        <p className="text-xs mt-1" style={{ color: "#86C59A" }}>잠시만 기다려주세요</p>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      key={activeSong.id}
                      value={rawTexts[activeSong.id] ?? ""}
                      onChange={(e) => handleRawTextChange(activeSong.id, e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                          e.preventDefault();
                          const prev = rawHistory.undo();
                          if (prev) {
                            const text = prev[activeSong.id] ?? "";
                            const parsed = slidesFromRaw(text);
                            setSlidesForSong(activeSong.id, parsed);
                            setSlideIds((ids) => ({
                              ...ids,
                              [activeSong.id]: parsed.map((_, i) => `${activeSong.id}-slide-${i}`),
                            }));
                            syncAllSlides(activeSong.id, parsed);
                          }
                        }
                      }}
                      className="flex-1 px-5 py-4 text-sm resize-none focus:outline-none font-mono leading-relaxed"
                      style={{ background: "#F2F7F0", color: "#1a3824" }}
                      spellCheck={false}
                    />
                  )}
                </div>

                {/* 오른쪽: 슬라이드 목록 */}
                <div className="hidden sm:flex">
                  <Divider onMouseDown={rightPanel.onMouseDown} />
                </div>
                <div
                  className="hidden sm:flex flex-shrink-0 flex-col"
                  style={{ width: rightPanel.size, background: "white" }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid #F2F7F0" }}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#86C59A" }}>
                      슬라이드 목록
                    </span>
                    <span
                      className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(46,94,62,0.1)", color: "#2E5E3E" }}
                    >
                      {(slidesPerSong[activeSong.id] ?? []).length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(activeSong.id, e)}
                    >
                      <SortableContext
                        items={slideIds[activeSong.id] ?? []}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-3">
                          {(slidesPerSong[activeSong.id] ?? []).map((slide, i) => {
                            const ids = slideIds[activeSong.id] ?? [];
                            return (
                              <SlideCard
                                key={ids[i] || `${activeSong.id}-slide-${i}`}
                                id={ids[i] || `${activeSong.id}-slide-${i}`}
                                order={slide.order}
                                lyrics={slide.lyrics}
                                isActive={false}
                                onClick={() => {}}
                                onRemove={() => handleRemoveSlide(activeSong.id, i)}
                                onInsertBefore={() => handleInsertSlide(activeSong.id, i)}
                                onInsertAfter={() => handleInsertSlide(activeSong.id, i + 1)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <button
                      onClick={() => handleAddSlide(activeSong.id)}
                      className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      style={{ border: "1.5px dashed #D8EBD0", color: "#86C59A" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#2E5E3E";
                        e.currentTarget.style.color = "#2E5E3E";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#D8EBD0";
                        e.currentTarget.style.color = "#86C59A";
                      }}
                    >
                      <Plus size={12} />
                      슬라이드 추가
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* 하단 버튼 */}
      <div
        className="px-6 py-4 flex items-center justify-between gap-4"
        style={{ borderTop: "1px solid #D8EBD0", background: "white" }}
      >
        <button
          onClick={() => router.push("/editor/step1")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
        >
          <ArrowLeft size={15} />
          이전
        </button>

        {mode === "lyrics" ? (
          <button
            onClick={handleRunAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#2E5E3E", boxShadow: "0 4px 16px rgba(46,94,62,0.2)" }}
          >
            {aiLoading
              ? <Loader2 size={15} className="animate-spin" />
              : <Wand2 size={15} />
            }
            AI 슬라이드 구분
          </button>
        ) : (
          <button
            onClick={() => router.push("/editor/step3")}
            disabled={totalSlides === 0}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#2E5E3E", boxShadow: totalSlides > 0 ? "0 4px 16px rgba(46,94,62,0.2)" : "none" }}
          >
            다음 단계
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Step2() {
  return (
    <Suspense>
      <Step2Inner />
    </Suspense>
  );
}
