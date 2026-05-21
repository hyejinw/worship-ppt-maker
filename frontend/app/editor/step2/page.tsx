"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, ArrowRight, Loader2, Plus, RefreshCw, Wand2, FileText } from "lucide-react";
import { clsx } from "clsx";

type Mode = "lyrics" | "slides";

function slidesFromRaw(text: string) {
  return text
    .split("//")
    .map((s, i) => ({ order: i + 1, lyrics: s.trim() }))
    .filter((s) => s.lyrics.length > 0);
}

function rawFromSlides(slides: { order: number; lyrics: string }[]) {
  return slides.map((s) => s.lyrics).join("\n//\n");
}

export default function Step2() {
  const router = useRouter();
  const { songs, slides, setSlides, rawText, setRawText, setSongLyrics } = usePPTStore();

  const [mode, setMode] = useState<Mode>("lyrics");
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideIds, setSlideIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // 각 곡의 가사 로컬 편집본 (store의 song.lyrics 를 초기값으로)
  const [editedLyrics, setEditedLyrics] = useState<Record<string, string>>(
    () => Object.fromEntries(songs.map((s) => [s.id, s.lyrics || ""]))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleLyricsChange = (songId: string, text: string) => {
    setEditedLyrics((prev) => ({ ...prev, [songId]: text }));
  };

  const handleRunAI = useCallback(async () => {
    setAiLoading(true);

    // 수정된 가사를 store에 반영
    for (const song of songs) {
      const edited = editedLyrics[song.id];
      if (edited !== song.lyrics) {
        setSongLyrics(song.id, edited, song.source);
      }
    }

    try {
      const allSlides: { order: number; lyrics: string }[] = [];
      let globalOrder = 1;

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const lyrics = editedLyrics[song.id];
        if (!lyrics?.trim()) continue;

        const result = await api.splitSlides(lyrics);
        for (const slide of result.slides) {
          allSlides.push({ order: globalOrder++, lyrics: slide.lyrics });
        }

        if (i < songs.length - 1) {
          allSlides.push({ order: globalOrder++, lyrics: "" });
        }
      }

      setSlides(allSlides);
      setRawText(rawFromSlides(allSlides));
      setSlideIds(allSlides.map((_, i) => `slide-${i}`));
      setMode("slides");
    } catch (e) {
      console.error("AI 슬라이드 구분 실패:", e);
    } finally {
      setAiLoading(false);
    }
  }, [songs, editedLyrics, setSongLyrics, setSlides, setRawText]);

  const handleRerunAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const allSlides: { order: number; lyrics: string }[] = [];
      let globalOrder = 1;

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const lyrics = editedLyrics[song.id];
        if (!lyrics?.trim()) continue;

        const result = await api.splitSlides(lyrics);
        for (const slide of result.slides) {
          allSlides.push({ order: globalOrder++, lyrics: slide.lyrics });
        }

        if (i < songs.length - 1) {
          allSlides.push({ order: globalOrder++, lyrics: "" });
        }
      }

      setSlides(allSlides);
      setRawText(rawFromSlides(allSlides));
      setSlideIds(allSlides.map((_, i) => `slide-${i}`));
    } catch (e) {
      console.error("AI 재구분 실패:", e);
    } finally {
      setAiLoading(false);
    }
  }, [songs, editedLyrics, setSlides, setRawText]);

  // 슬라이드 편집 핸들러
  const handleRawTextChange = (text: string) => {
    setRawText(text);
    const parsed = slidesFromRaw(text);
    setSlides(parsed);
    setSlideIds(parsed.map((_, i) => `slide-${i}`));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slideIds.indexOf(active.id as string);
    const newIndex = slideIds.indexOf(over.id as string);
    const newIds = arrayMove(slideIds, oldIndex, newIndex);
    const newSlides = newIds.map((id, i) => {
      const origIdx = slideIds.indexOf(id);
      return { ...slides[origIdx], order: i + 1 };
    });
    setSlideIds(newIds);
    setSlides(newSlides);
    setRawText(rawFromSlides(newSlides));
  };

  const handleRemoveSlide = (index: number) => {
    const newSlides = slides
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSlides(newSlides);
    setRawText(rawFromSlides(newSlides));
    setSlideIds(newSlides.map((_, i) => `slide-${i}`));
    if (activeSlideIndex >= newSlides.length) {
      setActiveSlideIndex(Math.max(0, newSlides.length - 1));
    }
  };

  const handleAddSlide = () => {
    const newSlides = [...slides, { order: slides.length + 1, lyrics: "" }];
    setSlides(newSlides);
    setRawText(rawFromSlides(newSlides));
    setSlideIds(newSlides.map((_, i) => `slide-${i}`));
    setActiveSlideIndex(newSlides.length - 1);
  };

  const activeSong = songs[activeSongIndex];

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header step={2} />

      {/* 모드 탭 */}
      <div className="border-b border-border bg-bg-sub px-6 flex items-center gap-1 pt-2">
        <button
          onClick={() => setMode("lyrics")}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            mode === "lyrics"
              ? "border-gold text-gold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <FileText size={14} />
          가사 검토
        </button>
        <button
          onClick={() => setMode("slides")}
          disabled={slides.length === 0}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-30",
            mode === "slides"
              ? "border-gold text-gold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <FileText size={14} />
          슬라이드 편집
          {slides.length > 0 && (
            <span className="ml-1 text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">
              {slides.length}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px - 41px - 73px)" }}>

        {/* ── 가사 검토 모드 ── */}
        {mode === "lyrics" && (
          <>
            {/* 왼쪽: 곡 목록 */}
            <div className="w-52 border-r border-border bg-bg-sub flex flex-col">
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
                        ? "bg-gold/10 text-gold border border-gold/30"
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

            {/* 오른쪽: 가사 편집 */}
            <div className="flex-1 flex flex-col">
              {activeSong && (
                <>
                  <div className="px-4 py-2.5 border-b border-border bg-bg-sub flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{activeSong.title}</span>
                      {activeSong.artist && (
                        <span className="text-xs text-text-muted ml-2">{activeSong.artist}</span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      불필요한 내용을 지우고 가사만 남겨주세요
                    </span>
                  </div>
                  <textarea
                    key={activeSong.id}
                    value={editedLyrics[activeSong.id] ?? ""}
                    onChange={(e) => handleLyricsChange(activeSong.id, e.target.value)}
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
            {/* 왼쪽: 텍스트 편집 */}
            <div className="flex-1 flex flex-col border-r border-border">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-bg-sub">
                <p className="text-xs text-text-muted">
                  <code className="text-gold">//</code> 로 슬라이드를 구분하세요
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRerunAI}
                  disabled={aiLoading}
                  className="gap-1.5"
                >
                  {aiLoading
                    ? <Loader2 size={13} className="animate-spin" />
                    : <RefreshCw size={13} />
                  }
                  AI 재구분
                </Button>
              </div>
              {aiLoading ? (
                <div className="flex-1 flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-gold mx-auto mb-2" />
                    <p className="text-sm">AI가 슬라이드를 구분하고 있습니다...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={rawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary resize-none focus:outline-none font-mono leading-relaxed"
                  spellCheck={false}
                />
              )}
            </div>

            {/* 오른쪽: 슬라이드 목록 */}
            <div className="w-72 flex flex-col bg-bg-sub">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-sm font-medium text-text-primary">
                  총 {slides.length}슬라이드
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1.5">
                      {slides.map((slide, i) => (
                        <SlideCard
                          key={slideIds[i] || `slide-${i}`}
                          id={slideIds[i] || `slide-${i}`}
                          order={slide.order}
                          lyrics={slide.lyrics}
                          isActive={activeSlideIndex === i}
                          onClick={() => setActiveSlideIndex(i)}
                          onRemove={() => handleRemoveSlide(i)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <button
                  onClick={handleAddSlide}
                  className="mt-2 w-full py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-gold hover:text-gold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  슬라이드 추가
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="border-t border-border bg-bg-sub px-6 py-4 flex justify-between">
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
            disabled={slides.length === 0}
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
