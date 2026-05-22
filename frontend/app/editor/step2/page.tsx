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
import { Button } from "@/components/ui/Button";
import { SlideCard } from "@/components/editor/SlideCard";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { ArrowLeft, ArrowRight, Loader2, Plus, RefreshCw, Wand2, FileText, Music } from "lucide-react";
import { clsx } from "clsx";

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

  // 히스토리 없이 값만 교체 (AI 결과 반영 등)
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
      className="w-1 flex-shrink-0 bg-border hover:bg-accent/40 cursor-col-resize transition-colors group relative"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
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

  // 가사 모드 사이드바 너비
  const sidebarLyrics = useResizable(208, 120, 400);
  // 슬라이드 모드 사이드바 너비
  const sidebarSlides = useResizable(208, 120, 400);
  // 슬라이드 모드 오른쪽 패널 너비 (기본 40% 느낌으로)
  const rightPanel = useResizable(380, 200, 600, -1);

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
    // 다음 렌더 사이클 후 잠금 해제
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
    setSlideIds((prev) => ({
      ...prev,
      [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`),
    }));
    syncAllSlides(songId, newSlides);
  };

  const handleAddSlide = (songId: string) => {
    const currentSlides = slidesPerSong[songId] ?? [];
    const newSlides = [...currentSlides, { order: currentSlides.length + 1, lyrics: "" }];
    setSlidesForSong(songId, newSlides);
    setSlideIds((prev) => ({
      ...prev,
      [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`),
    }));
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
    setSlideIds((prev) => ({
      ...prev,
      [songId]: newSlides.map((_, i) => `${songId}-slide-${i}`),
    }));
    syncAllSlides(songId, newSlides);
  };

  const activeSong = songs[activeSongIndex];
  const totalSlides = Object.values(slidesPerSong).reduce((acc, s) => acc + s.length, 0);

  // 모바일 전용: 곡 목록 패널 표시 여부
  const [showSongList, setShowSongList] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header step={2} />

      {/* 모드 탭 */}
      <div className="border-b border-border bg-card px-2 sm:px-6 flex items-center gap-1 pt-2">
        <button
          onClick={() => setMode("lyrics")}
          className={clsx(
            "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            mode === "lyrics"
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <FileText size={14} />
          가사 검토
        </button>
        <button
          onClick={() => setMode("slides")}
          disabled={totalSlides === 0}
          className={clsx(
            "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-30",
            mode === "slides"
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <FileText size={14} />
          슬라이드 편집
          {totalSlides > 0 && (
            <span className="ml-1 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
              {totalSlides}
            </span>
          )}
        </button>

        {/* 모바일 곡 선택 버튼 */}
        {songs.length > 1 && (
          <button
            onClick={() => setShowSongList((v) => !v)}
            className="ml-auto sm:hidden flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20"
          >
            <Music size={13} />
            {activeSong?.title ?? "곡 선택"}
          </button>
        )}
      </div>

      {/* 모바일 곡 목록 드롭다운 */}
      {showSongList && (
        <div className="sm:hidden border-b border-border bg-bg-sub p-2 flex flex-col gap-1 z-10">
          {songs.map((song, i) => (
            <button
              key={song.id}
              onClick={() => { setActiveSongIndex(i); setShowSongList(false); }}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activeSongIndex === i
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-text-primary hover:bg-card border border-transparent"
              )}
            >
              <p className="font-medium truncate">{song.title}</p>
              {song.artist && <p className="text-xs text-text-muted truncate">{song.artist}</p>}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px - 41px - 73px)" }}>

        {/* ── 가사 검토 모드 ── */}
        {mode === "lyrics" && (
          <>
            {/* 데스크탑: 왼쪽 사이드바 */}
            <div className="hidden sm:flex flex-shrink-0 border-r border-border bg-bg-sub flex-col" style={{ width: sidebarLyrics.size }}>
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-medium text-text-muted">곡 목록</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {songs.map((song, i) => (
                  <button
                    key={song.id}
                    onClick={() => setActiveSongIndex(i)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      activeSongIndex === i
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "text-text-primary hover:bg-card"
                    )}
                  >
                    <p className="font-medium truncate">{song.title}</p>
                    {song.artist && (
                      <p className="text-xs text-text-muted truncate">{song.artist}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden sm:block">
              <Divider onMouseDown={sidebarLyrics.onMouseDown} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {activeSong && (
                <>
                  <div className="px-4 py-2.5 border-b border-border bg-bg-sub flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{activeSong.title}</span>
                      {activeSong.artist && (
                        <span className="text-xs text-text-muted ml-2">{activeSong.artist}</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5">
                      ⚠ 웹 수집 가사는 틀릴 수 있어요 — 직접 확인 후 수정해주세요
                    </span>
                  </div>
                  <textarea
                    key={activeSong.id}
                    value={editedLyrics[activeSong.id] ?? ""}
                    onChange={(e) => handleLyricsChange(activeSong.id, e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                        e.preventDefault();
                        const prev = lyricsHistory.undo();
                        if (prev) {
                          const text = prev[activeSong.id] ?? "";
                          const song = songs.find((s) => s.id === activeSong.id);
                          setSongLyrics(activeSong.id, text, song?.source ?? null);
                        }
                      }
                    }}
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary resize-none focus:outline-none font-mono leading-relaxed"
                    spellCheck={false}
                    placeholder="가사를 입력하세요..."
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* ── 슬라이드 편집 모드 ── */}
        {mode === "slides" && (
          <>
            {/* 데스크탑: 왼쪽 사이드바 */}
            <div className="hidden sm:flex flex-shrink-0 border-r border-border bg-bg-sub flex-col" style={{ width: sidebarSlides.size }}>
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-medium text-text-muted">곡 목록</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {songs.map((song, i) => {
                  const count = (slidesPerSong[song.id] ?? []).length;
                  return (
                    <button
                      key={song.id}
                      onClick={() => setActiveSongIndex(i)}
                      className={clsx(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        activeSongIndex === i
                          ? "bg-accent/10 text-accent border border-accent/30"
                          : "text-text-primary hover:bg-card"
                      )}
                    >
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{count}슬라이드</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:block">
              <Divider onMouseDown={sidebarSlides.onMouseDown} />
            </div>

            {activeSong && (
              <>
                {/* 가운데: 텍스트 에디터 */}
                <div className="flex-1 flex flex-col border-r border-border min-w-0">
                  <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-bg-sub">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-text-primary truncate block sm:inline">{activeSong.title}</span>
                      <span className="text-xs text-text-muted sm:ml-2 hidden sm:inline">
                        <code className="text-accent">//</code> 로 슬라이드 구분
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRerunAI(activeSong.id, editedLyrics[activeSong.id] ?? "")}
                      disabled={aiLoading}
                      className="gap-1.5 shrink-0 ml-2"
                    >
                      {aiLoading
                        ? <Loader2 size={13} className="animate-spin" />
                        : <RefreshCw size={13} />
                      }
                      <span className="hidden sm:inline">AI </span>재구분
                    </Button>
                  </div>
                  {aiLoading ? (
                    <div className="flex-1 flex items-center justify-center text-text-muted">
                      <div className="text-center">
                        <Loader2 size={32} className="animate-spin text-accent mx-auto mb-2" />
                        <p className="text-sm">AI가 슬라이드를 구분하고 있습니다...</p>
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
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary resize-none focus:outline-none font-mono leading-relaxed"
                      spellCheck={false}
                    />
                  )}
                </div>

                {/* 데스크탑: 오른쪽 슬라이드 목록 */}
                <div className="hidden sm:flex">
                  <Divider onMouseDown={rightPanel.onMouseDown} />
                </div>
                <div className="hidden sm:flex flex-shrink-0 flex-col bg-bg-sub" style={{ width: rightPanel.size }}>
                  <div className="px-4 py-2.5 border-b border-border">
                    <span className="text-sm font-medium text-text-primary">
                      {(slidesPerSong[activeSong.id] ?? []).length}슬라이드
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
                      className="mt-2 w-full py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1"
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
      <div className="border-t border-border bg-bg-sub px-4 sm:px-6 py-4 flex justify-between">
        <Button variant="secondary" size="lg" onClick={() => router.push("/editor/step1")} className="gap-2">
          <ArrowLeft size={18} />
          이전
        </Button>

        {mode === "lyrics" ? (
          <Button size="lg" onClick={handleRunAI} disabled={aiLoading} className="gap-2">
            {aiLoading
              ? <Loader2 size={18} className="animate-spin" />
              : <Wand2 size={18} />
            }
            AI 슬라이드 구분
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => router.push("/editor/step3")}
            disabled={totalSlides === 0}
            className="gap-2"
          >
            다음 단계
            <ArrowRight size={18} />
          </Button>
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
