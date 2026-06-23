"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@/components/ui/Header";
import { SlideCard } from "@/components/editor/SlideCard";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { getLyricsNoticeDismissed, setLyricsNoticeDismissed } from "@/lib/localStorage";
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
  Languages,
  Parentheses,
  Search,
  GripVertical,
  X,
  PencilLine,
  Check,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Mode = "lyrics" | "slides";
type EditorMode = Mode;

interface EditorPageProps {
  headerStep: 1 | 2 | 3;
  initialMode: EditorMode;
  availableModes: EditorMode[];
  backHref: string;
  nextHref: string;
  showModeTabs?: boolean;
}

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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function uniqueSearchCandidates(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = normalizeSearchText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function removeDuplicateLines(text: string) {
  const seen = new Set<string>();
  return text
    .split("\n")
    .filter((line) => {
      const key = line.trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

function renumberLines(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const cleaned = line.replace(/^\s*\d+[\).\-\s]+/, "").trim();
      return cleaned;
    })
    .join("\n");
}

function cleanBlankLines(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");
}

function removeEnglishLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/[A-Za-z]/g, ""))
    .join("\n");
}

function findSongByNormalizedTitle(songs: { id: string; title: string }[], title: string) {
  const target = normalizeSearchText(title);
  return songs.find((song) => normalizeSearchText(song.title) === target);
}

function removeParenthesesText(text: string) {
  return text
    .replace(/[()[\]{}]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n");
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
      className="w-1 h-full flex-shrink-0 cursor-col-resize transition-colors relative"
      style={{ background: "#D8EBD0" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(46,94,62,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#D8EBD0")}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

function SortableSongItem({
  song,
  isActive,
  count,
  step1Redesign = false,
  onSelect,
  onRemove,
}: {
  song: { id: string; title: string; artist: string; loading?: boolean; error?: boolean; source?: string | null };
  isActive: boolean;
  count: number | null;
  step1Redesign?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id });
  const statusText = song.loading
    ? "현재 검색 중"
    : song.error && !song.loading
    ? "가사를 찾지 못함"
    : isActive
    ? "현재 편집 중"
    : step1Redesign && (song.source || song.artist || song.title)
    ? "가사 로드됨"
    : null;
  const statusColor = song.loading
    ? step1Redesign
      ? "#4A6B56"
      : isActive
      ? "rgba(255,255,255,0.78)"
      : "#5BAA72"
    : song.error
    ? step1Redesign
      ? "#DC2626"
      : isActive
      ? "rgba(255,255,255,0.78)"
      : "#DC2626"
    : step1Redesign
    ? "#4A6B56"
    : isActive
    ? "rgba(255,255,255,0.5)"
    : "#5BAA72";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-stretch rounded-xl text-sm transition-all group overflow-hidden"
    >
      <div
        className="min-w-0 flex-1 text-left pl-3 pr-2 py-2.5 transition-all flex items-center gap-2"
        style={{
          background: step1Redesign ? (isActive ? "#FFFFFF" : "rgba(255,255,255,0.42)") : (isActive ? "#2E5E3E" : "transparent"),
          color: step1Redesign ? "#131914" : isActive ? "white" : "#1a3824",
          border: step1Redesign ? `1px solid ${isActive ? "#BFCABF" : "#CDD5CC"}` : "none",
          borderRadius: step1Redesign ? 16 : 0,
          boxShadow: step1Redesign && isActive ? "0 10px 24px rgba(20,26,22,0.08)" : "none",
        }}
      >
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
          style={{
            color: step1Redesign ? "#5C665E" : isActive ? "rgba(255,255,255,0.85)" : "#86C59A",
            background: step1Redesign ? (isActive ? "#EEF2EC" : "#E7ECE6") : isActive ? "rgba(255,255,255,0.12)" : "transparent",
            touchAction: "none",
          }}
          aria-label={`${song.title} 순서 변경`}
        >
          <GripVertical size={14} />
        </button>
        <button
          onClick={onSelect}
          className="flex-1 min-w-0 text-left rounded-lg transition-colors"
          style={{ color: "inherit" }}
          aria-label={`${song.title} 선택`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Music size={12} style={{ color: step1Redesign ? "#5C665E" : isActive ? "rgba(255,255,255,0.7)" : "#86C59A", flexShrink: 0 }} />
            <p className="font-semibold truncate text-sm">{song.title}</p>
          </div>
          {song.artist && (
            <p
              className="text-sm truncate mt-0.5"
              style={{ color: step1Redesign ? "#5B645D" : isActive ? "rgba(255,255,255,0.6)" : "#86C59A" }}
            >
              {song.artist}
            </p>
          )}
          {statusText && (
            <p className="text-xs mt-0.5" style={{ color: statusColor }}>
              {statusText}
            </p>
          )}
          {count !== null && !statusText && (
            <p className="text-xs mt-0.5" style={{ color: step1Redesign ? "#5B645D" : "#5BAA72" }}>{count}슬라이드</p>
          )}
        </button>
        <button
          onClick={onRemove}
          className="ml-1 flex-shrink-0 w-7 h-7 rounded-lg grid place-items-center transition-colors"
          style={{
            color: step1Redesign ? "#5C665E" : isActive ? "rgba(255,255,255,0.85)" : "#86C59A",
            background: step1Redesign ? (isActive ? "#EEF2EC" : "transparent") : isActive ? "rgba(255,255,255,0.08)" : "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.color = step1Redesign ? "#5C665E" : isActive ? "rgba(255,255,255,0.85)" : "#86C59A")}
          aria-label={`${song.title} 삭제`}
        >
          <X size={14} />
        </button>
      </div>
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
  step1Redesign = false,
  onAddSong,
  onRemoveSong,
  onReorderSongs,
}: {
  songs: { id: string; title: string; artist: string; loading?: boolean; error?: boolean }[];
  activeSongIndex: number;
  setActiveSongIndex: (i: number) => void;
  slidesPerSong: Record<string, { order: number; lyrics: string }[]>;
  showCount: boolean;
  width: number;
  step1Redesign?: boolean;
  onAddSong?: () => void;
  onRemoveSong: (id: string) => void;
  onReorderSongs: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSongDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = songs.map((song) => song.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderSongs(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div
      className="hidden lg:flex flex-shrink-0 flex-col"
      style={{
        width,
        background: step1Redesign ? "#DDE4DA" : "white",
        borderRight: step1Redesign ? "1px solid #CCD4CA" : "1px solid #D8EBD0",
      }}
    >
      {/* 헤더 */}
      <div
        className={step1Redesign ? "px-5 pt-5 pb-4" : "px-4 py-3 flex items-center justify-between"}
        style={{ borderBottom: step1Redesign ? "1px solid #C9D1C8" : "1px solid #D8EBD0" }}
      >
        {step1Redesign ? (
          <>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#7D867F" }}
            >
              곡 목록
            </p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight" style={{ color: "#182019" }}>
                {songs.length}곡
              </p>
              {onAddSong && (
                <button
                  onClick={onAddSong}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                  style={{ background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F7F8F5";
                  }}
                >
                  <Plus size={12} />
                  곡 추가
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#86C59A" }}
            >
              곡 목록
            </p>
            {onAddSong && (
              <button
                onClick={onAddSong}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E", border: "1px solid rgba(46,94,62,0.15)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(46,94,62,0.14)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(46,94,62,0.08)";
                }}
              >
                <Plus size={11} />
                추가
              </button>
            )}
          </>
        )}
      </div>

      {/* 곡 목록 */}
      <div className={step1Redesign ? "flex-1 overflow-y-auto p-3 flex flex-col gap-2" : "flex-1 overflow-y-auto p-2 flex flex-col gap-1"}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSongDragEnd}>
          <SortableContext items={songs.map((song) => song.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {songs.map((song, i) => (
                <SortableSongItem
                  key={song.id}
                  song={song}
                  isActive={activeSongIndex === i}
                  count={showCount ? (slidesPerSong[song.id] ?? []).length : null}
                  step1Redesign={step1Redesign}
                  onSelect={() => setActiveSongIndex(i)}
                  onRemove={() => onRemoveSong(song.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* 곡 추가하기 카드 */}
        {onAddSong && (
          <button
            onClick={onAddSong}
            className="w-full text-left px-3 py-3 rounded-xl text-sm transition-all mt-1"
            style={step1Redesign ? {
              border: "1px dashed #C8D0C7",
              color: "#5B645D",
              background: "rgba(255,255,255,0.42)",
            } : {
              border: "1.5px dashed #D8EBD0",
              color: "#86C59A",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = step1Redesign ? "#BFCABF" : "#2E5E3E";
              e.currentTarget.style.color = step1Redesign ? "#1A2C20" : "#2E5E3E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = step1Redesign ? "#C8D0C7" : "#D8EBD0";
              e.currentTarget.style.color = step1Redesign ? "#5B645D" : "#86C59A";
            }}
          >
            <div className="flex items-center gap-2">
              <Plus size={14} />
              <div>
                <p className="font-semibold text-sm">곡 추가하기</p>
                <p className="text-xs mt-0.5">다른 찬양을 추가하세요</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Tip */}
      {!step1Redesign && (
        <div
          className="mx-2 mb-2 px-3 py-3 rounded-xl"
          style={{ background: "#F2F7F0", border: "1px solid #D8EBD0" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "#5BAA72" }}>💡 Tip</p>
          <p className="text-sm leading-relaxed" style={{ color: "#86C59A" }}>
            가사를 클릭하면<br />수정할 수 있어요.
          </p>
        </div>
      )}
    </div>
  );
}

function MobileSongSwitcher({
  songs,
  activeSongIndex,
  setActiveSongIndex,
  slidesPerSong,
  showCount,
  showAddSong,
  step1Redesign = false,
  isOpen,
  onToggle,
  onAddSong,
  onRemoveSong,
  onReorderSongs,
}: {
  songs: { id: string; title: string; artist: string; loading?: boolean; error?: boolean }[];
  activeSongIndex: number;
  setActiveSongIndex: (i: number, options?: { closeTray?: boolean }) => void;
  slidesPerSong: Record<string, { order: number; lyrics: string }[]>;
  showCount: boolean;
  showAddSong: boolean;
  step1Redesign?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onAddSong: () => void;
  onRemoveSong: (id: string) => void;
  onReorderSongs: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSongDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = songs.map((song) => song.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderSongs(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div
      className="lg:hidden"
      style={{
        background: step1Redesign ? "#DDE4DA" : "white",
        borderBottom: step1Redesign ? "1px solid #CCD4CA" : "1px solid #D8EBD0",
      }}
    >
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: step1Redesign ? "#7D867F" : "#86C59A" }}>
              {step1Redesign ? "곡 목록" : "Selected Songs"}
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: step1Redesign ? "#182019" : "#1a3824" }}>
              {songs.length}곡 선택됨
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showAddSong && (
              <button
                onClick={onAddSong}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={step1Redesign ? { background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" } : { background: "#E4F1E1", color: "#2E5E3E", border: "1px solid #CFE3C8" }}
              >
                <Plus size={12} />
                곡 추가
              </button>
            )}
            {songs.length > 1 && (
              <button
                onClick={onToggle}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                style={step1Redesign ? { background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" } : { background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
              >
                <GripVertical size={12} />
                순서 편집
                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex items-center gap-2 min-w-max pr-1">
            {songs.map((song, i) => {
              const isActive = activeSongIndex === i;
              const count = showCount ? (slidesPerSong[song.id] ?? []).length : null;
              return (
                <button
                  key={song.id}
                  onClick={() => setActiveSongIndex(i)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold transition-all max-w-[13rem] shrink-0"
                  style={{
                    background: step1Redesign ? (isActive ? "#FFFFFF" : "rgba(255,255,255,0.42)") : isActive ? "#2E5E3E" : "#F6FBF4",
                    color: step1Redesign ? "#151A16" : isActive ? "white" : "#2E5E3E",
                    border: step1Redesign ? `1px solid ${isActive ? "#BCC7BC" : "#CCD4CA"}` : `1px solid ${isActive ? "#2E5E3E" : "#D8EBD0"}`,
                    boxShadow: step1Redesign ? "none" : isActive ? "0 8px 18px rgba(46,94,62,0.2)" : "none",
                  }}
                >
                  <Music size={12} />
                  <span className="truncate">{song.title}</span>
                  {count !== null && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: step1Redesign ? "#EEF2EC" : isActive ? "rgba(255,255,255,0.16)" : "rgba(46,94,62,0.1)",
                        color: step1Redesign ? "#2E5E3E" : isActive ? "white" : "#2E5E3E",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isOpen && songs.length > 1 && (
        <div className="px-3 pb-3">
            <div
              className="rounded-[20px] overflow-hidden shadow-sm"
              style={{ background: step1Redesign ? "#FCFEFA" : "#FCFEFA", border: "1px solid #D8EBD0" }}
            >
            <div
              className="px-4 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid #D8EBD0" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#86C59A" }}>
                  곡 관리
                </p>
              </div>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSongDragEnd}>
                <SortableContext items={songs.map((song) => song.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5">
                    {songs.map((song, i) => (
                      <SortableSongItem
                        key={song.id}
                        song={song}
                        isActive={activeSongIndex === i}
                        count={showCount ? (slidesPerSong[song.id] ?? []).length : null}
                        step1Redesign={step1Redesign}
                        onSelect={() => setActiveSongIndex(i, { closeTray: true })}
                        onRemove={() => onRemoveSong(song.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 우측 패널 (준비 중 항목)
function RightPanel({
  song,
  width,
  step1Redesign = false,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon,
  primaryActionDisabled = false,
  lyricsActionsDisabled = false,
  onRestoreOriginal,
  onRemoveDuplicates,
  onRenumberLines,
  onCleanBlankLines,
  onRemoveEnglish,
  onRemoveParentheses,
}: {
  song: { title: string; artist: string; source?: string | null } | undefined;
  width: number;
  step1Redesign?: boolean;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  primaryActionDisabled?: boolean;
  lyricsActionsDisabled?: boolean;
  onRestoreOriginal: () => void;
  onRemoveDuplicates: () => void;
  onRenumberLines: () => void;
  onCleanBlankLines: () => void;
  onRemoveEnglish: () => void;
  onRemoveParentheses: () => void;
}) {
  const lyricsItems = [
    { label: "원본 가사로 되돌리기", icon: <RotateCcw size={13} />, onClick: onRestoreOriginal },
    { label: "중복 제거", icon: <Copy size={13} />, onClick: onRemoveDuplicates },
    { label: "줄 번호 재정렬", icon: <ListOrdered size={13} />, onClick: onRenumberLines },
    { label: "빈 줄 정리", icon: <AlignJustify size={13} />, onClick: onCleanBlankLines },
    { label: "영어 가사 삭제", icon: <Languages size={13} />, onClick: onRemoveEnglish },
    { label: "괄호 삭제", icon: <Parentheses size={13} />, onClick: onRemoveParentheses },
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
      className={`hidden xl:flex flex-col flex-shrink-0 overflow-y-auto px-5 py-5 ${step1Redesign ? "gap-3" : "gap-5"}`}
      style={{ width, background: step1Redesign ? "transparent" : "white" }}
    >
      {step1Redesign && onPrimaryAction && primaryActionLabel && (
        <div
          className="rounded-[28px] p-5"
          style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 42px rgba(20,26,22,0.06)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7D867F" }}>
            다음 단계
          </p>
          <h3 className="text-[20px] font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>
            가사를 확인했다면 다음 단계
          </h3>
          <button
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] text-[13px] sm:text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "#223B2A" }}
          >
            {primaryActionIcon}
            {primaryActionLabel}
          </button>
        </div>
      )}

      {/* 가사 관리 */}
      <div
        className={step1Redesign ? "rounded-[28px] p-5" : "px-4 pt-4 pb-3"}
        style={step1Redesign ? { background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 42px rgba(20,26,22,0.06)" } : { borderBottom: "1px solid #F2F7F0" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: step1Redesign ? "#7D867F" : "#86C59A" }}>
          가사 관리
        </p>
        {step1Redesign && (
          <h3 className="text-[20px] font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>
            빠른 정리 도구
          </h3>
        )}
        <div className={step1Redesign ? "mt-5 flex flex-col gap-3" : "flex flex-col gap-0.5"}>
          {lyricsItems.map((item) => (
            <button
              key={item.label}
              onClick={lyricsActionsDisabled ? undefined : item.onClick}
              disabled={lyricsActionsDisabled}
              className={step1Redesign ? "rounded-2xl px-4 py-3 text-left text-[13px] font-semibold transition-all w-full disabled:cursor-not-allowed" : "flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all w-full text-left disabled:cursor-not-allowed"}
              style={step1Redesign ? { background: "#FFFFFF", color: lyricsActionsDisabled ? "#A5ACA6" : "#253029", border: "1px solid #D6DAD3", opacity: lyricsActionsDisabled ? 0.58 : 1 } : { color: lyricsActionsDisabled ? "#B8DBBF" : "#4a7a56", opacity: lyricsActionsDisabled ? 0.58 : 1 }}
              onMouseEnter={(e) => { if (!step1Redesign) e.currentTarget.style.background = "#F2F7F0"; }}
              onMouseLeave={(e) => { if (!step1Redesign) e.currentTarget.style.background = "transparent"; }}
            >
              {step1Redesign ? item.label.replace("원본 가사로 되돌리기", "원본 복원").replace("줄 번호 재정렬", "줄 번호 정리").replace("영어 가사 삭제", "영어 삭제") : (
                <>
                  <span style={{ color: "#86C59A" }}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 곡 정보 */}
      {song && !step1Redesign && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#86C59A" }}>
            곡 정보
          </p>
          <div className="flex flex-col gap-1.5">
            {songInfo.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <span className="text-xs w-14 flex-shrink-0" style={{ color: "#86C59A" }}>{row.key}</span>
                <span className="text-xs font-medium" style={{ color: "#1a3824" }}>{row.value}</span>
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
  step1Redesign = false,
  onChange,
  onUndo,
  onActivate,
}: {
  songId: string;
  text: string;
  step1Redesign?: boolean;
  onChange: (t: string) => void;
  onUndo: () => void;
  onActivate?: () => void;
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
    <div className="flex-1 h-full min-h-0 flex overflow-hidden">
      {/* 줄 번호 열 */}
      <div
        ref={numRef}
        className={step1Redesign ? "overflow-hidden flex-shrink-0 select-none py-5 pr-1.5 pl-1.5 sm:pr-2.5 sm:pl-2.5" : "overflow-hidden flex-shrink-0 select-none py-5 pr-2 pl-4"}
        style={{ background: step1Redesign ? "#F7F7F3" : 'white', width: step1Redesign ? 42 : 52, borderRight: step1Redesign ? "1px solid #E3E6E0" : "none" }}
      >
        {lines.map((_, i) => (
          <div
            key={i}
            className="font-mono text-xs text-right"
            style={{ color: step1Redesign ? "#8A928B" : '#B8DBBF', lineHeight: '1.625rem' }}
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
        onFocus={onActivate}
        onClick={onActivate}
        onScroll={syncScroll}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            onUndo();
          }
        }}
        className={step1Redesign ? "flex-1 h-full min-h-0 py-5 pr-5 sm:pr-6 text-[15px] sm:text-[16px] resize-none focus:outline-none" : "flex-1 py-5 pr-6 text-sm resize-none focus:outline-none"}
        style={{
          background: 'white',
          color: step1Redesign ? "#161C17" : '#1a3824',
          lineHeight: '1.625rem',
          paddingLeft: step1Redesign ? 20 : 4,
          overflowY: 'auto',
        }}
        spellCheck={false}
        placeholder="가사를 입력하세요..."
      />
    </div>
  );
}

function SongSearchPanel({
  query,
  artist,
  songsCount,
  searchLocked,
  showCancelSearch,
  step1Redesign = false,
  showCloseButton = false,
  resultSong,
  inputRef,
  artistInputRef,
  onQueryChange,
  onArtistChange,
  onAddSong,
  onCancelSearch,
  onClose,
}: {
  query: string;
  artist: string;
  songsCount: number;
  searchLocked: boolean;
  showCancelSearch: boolean;
  step1Redesign?: boolean;
  showCloseButton?: boolean;
  resultSong: {
    id: string;
    title: string;
    artist: string;
    lyrics: string | null;
    loading: boolean;
    error: boolean;
    source: "manual" | "tavily" | "db" | null;
  } | undefined;
  inputRef: React.RefObject<HTMLInputElement>;
  artistInputRef: React.RefObject<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  onArtistChange: (value: string) => void;
  onAddSong: () => void;
  onCancelSearch: () => void;
  onClose?: () => void;
}) {
  const queryComposingRef = useRef(false);

  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const moveFocus = () => artistInputRef.current?.focus();
      if (queryComposingRef.current || e.nativeEvent.isComposing) {
        window.setTimeout(moveFocus, 0);
      } else {
        requestAnimationFrame(moveFocus);
      }
      return;
    }
    if (e.key === "Enter") e.preventDefault();
  };

  const handleArtistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onAddSong();
  };

  return (
    <div className={step1Redesign ? "w-full" : "flex-1 overflow-y-auto px-4 sm:px-5 py-5 sm:py-6"} style={{ background: step1Redesign ? "transparent" : "#F2F7F0" }}>
      <div className={step1Redesign ? "w-full" : "mx-auto w-full max-w-xl"}>
        {!step1Redesign && (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <h2 className="shrink-0 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: "#1a3824" }}>
              곡 선택
            </h2>
            <p className="sm:ml-auto text-left sm:text-right text-sm leading-relaxed max-w-[23rem] pt-1" style={{ color: "#5BAA72" }}>
              아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
            </p>
          </div>
        )}

        <div
          className={step1Redesign ? "rounded-[28px] p-5 sm:p-6" : "rounded-2xl p-5 mb-4"}
          style={step1Redesign ? { background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 48px rgba(20,26,22,0.08)" } : { background: "white", border: "1px solid #D8EBD0", boxShadow: "0 2px 16px rgba(46,94,62,0.06)" }}
        >
          <div className={step1Redesign ? "flex items-end justify-between gap-3 mb-4" : "flex items-center justify-between mb-3"}>
            <div>
              <p className={step1Redesign ? "text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em]" : "text-xs font-semibold uppercase tracking-widest"} style={{ color: step1Redesign ? "#7D867F" : "#86C59A" }}>곡 검색</p>
              {step1Redesign && <p className="text-[13px] sm:text-sm mt-1" style={{ color: "#616A62" }}>아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.</p>}
            </div>
            {step1Redesign && showCloseButton ? (
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-[11px] sm:text-xs font-medium" style={{ color: "#7B857C" }}>최대 10곡</p>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl grid place-items-center"
                  style={{ background: "#EBEEEA", color: "#4F5C52" }}
                  aria-label="검색 닫기"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className={step1Redesign ? "text-[11px] sm:text-xs font-medium shrink-0" : "text-xs"} style={{ color: step1Redesign ? "#7B857C" : "#86C59A" }}>최대 10곡</p>
            )}
          </div>
          <div className={step1Redesign ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 mb-0" : "flex gap-2 mb-3"}>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: step1Redesign ? "#6B746C" : "#86C59A" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={handleQueryKeyDown}
                onKeyUp={handleKeyUp}
                onCompositionStart={() => {
                  queryComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  queryComposingRef.current = false;
                }}
                placeholder="곡명 (예: 베드로의 고백)"
                disabled={songsCount >= 10}
                className={step1Redesign ? "w-full rounded-[20px] pl-9 pr-4 py-3.5 text-[13px] sm:text-sm transition-colors" : "w-full rounded-xl pl-9 pr-4 py-2.5 text-sm transition-colors"}
                style={{
                  background: step1Redesign ? "#FFFFFF" : "#F2F7F0",
                  border: step1Redesign ? "1px solid #CDD3CC" : "1px solid #D8EBD0",
                  color: step1Redesign ? "#151A16" : "#1a3824",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2E5E3E")}
                onBlur={(e) => (e.currentTarget.style.borderColor = step1Redesign ? "#CDD3CC" : "#D8EBD0")}
              />
            </div>
            <input
              ref={artistInputRef}
              type="text"
              value={artist}
              onChange={(e) => onArtistChange(e.target.value)}
              onKeyDown={handleArtistKeyDown}
              onKeyUp={handleKeyUp}
              placeholder="아티스트 (선택)"
              disabled={songsCount >= 10}
              className={step1Redesign ? "w-full rounded-[20px] px-4 py-3.5 text-[13px] sm:text-sm transition-colors" : "w-full sm:w-52 rounded-xl px-3 py-2 text-sm transition-colors"}
              style={{
                background: step1Redesign ? "#FFFFFF" : "#F2F7F0",
                border: step1Redesign ? "1px solid #CDD3CC" : "1px solid #D8EBD0",
                color: step1Redesign ? "#151A16" : "#1a3824",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2E5E3E")}
              onBlur={(e) => (e.currentTarget.style.borderColor = step1Redesign ? "#CDD3CC" : "#D8EBD0")}
            />
            <button
              onClick={onAddSong}
              disabled={!query.trim() || songsCount >= 10 || searchLocked}
              className={step1Redesign ? "inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[20px] text-[13px] sm:text-sm font-semibold text-white transition-all shrink-0 disabled:opacity-40" : "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shrink-0 disabled:opacity-40"}
              style={{ background: step1Redesign ? "#223B2A" : "#2E5E3E" }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className={step1Redesign ? "" : "hidden sm:inline"}>{step1Redesign ? "곡 추가" : "추가"}</span>
            </button>
          </div>
        </div>

        {resultSong && !step1Redesign && (
          <div className={step1Redesign ? "rounded-[28px] overflow-hidden" : "rounded-2xl overflow-hidden"} style={{ background: step1Redesign ? "#F8F8F5" : "white", border: step1Redesign ? "1px solid #D6DAD3" : "1px solid #D8EBD0" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #F2F7F0" }}>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "#1a3824" }}>{resultSong.title}</p>
                {resultSong.artist && <p className="text-xs mt-0.5" style={{ color: "#86C59A" }}>{resultSong.artist}</p>}
              </div>
              {resultSong.loading && <Loader2 size={16} className="animate-spin" style={{ color: "#2E5E3E" }} />}
            </div>
            {resultSong.loading ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "#5BAA72" }}>
                <p>가사를 검색하고 있습니다...</p>
                {showCancelSearch && (
                  <button
                    onClick={onCancelSearch}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
                  >
                    검색 취소하고 직접 입력하기
                  </button>
                )}
              </div>
            ) : resultSong.error ? (
              <div className="px-5 py-5">
                <p className="text-sm font-medium mb-3" style={{ color: "#92400E" }}>
                  가사를 찾지 못했습니다. 곡명을 눌러 직접 입력하세요.
                </p>
              </div>
            ) : (
              <div className="px-5 py-5">
                <textarea
                  value={resultSong.lyrics ?? ""}
                  readOnly
                  className={step1Redesign ? "w-full min-h-[320px] rounded-[24px] px-5 py-5 text-[15px] resize-y focus:outline-none" : "w-full min-h-[320px] rounded-xl px-4 py-3 text-sm resize-y focus:outline-none"}
                  style={{ background: step1Redesign ? "#FFFFFF" : "#F2F7F0", border: step1Redesign ? "1px solid #D6DAD3" : "1px solid #D8EBD0", color: "#1a3824", lineHeight: 1.7 }}
                />
                <p className="text-xs mt-2" style={{ color: "#5BAA72" }}>
                  수정하려면 왼쪽 곡 목록에서 곡명을 누르세요.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorFlowInner({
  headerStep,
  initialMode,
  availableModes,
  backHref,
  nextHref,
  showModeTabs = true,
}: EditorPageProps) {
  const router = useRouter();
  const {
    songs,
    addSong,
    removeSong,
    reorderSongs,
    updateSongTitle,
    setSlides,
    slidesPerSong,
    setSlidesForSong,
    setRawText,
    setSongLyrics,
    setSongOriginalLyrics,
    setSongLoading,
    setSongError,
    setSongSlideSplitFailed,
  } = usePPTStore();

  const [mode, setMode] = useState<Mode>(() => {
    return availableModes.includes(initialMode) ? initialMode : availableModes[0];
  });
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [showSearchPanel, setShowSearchPanel] = useState(() => songs.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [searchResultSongId, setSearchResultSongId] = useState<string | null>(null);
  const [slideIds, setSlideIds] = useState<Record<string, string[]>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [showCancelSearch, setShowCancelSearch] = useState(false);
  const [showLyricsNotice, setShowLyricsNotice] = useState(true);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showMobileSlideList, setShowMobileSlideList] = useState(true);
  const [activeLyricsEditorSongId, setActiveLyricsEditorSongId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const artistInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopArtistInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchRequestSeqRef = useRef(0);

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

  const originalLyricsRef = useRef<Record<string, string>>(
    Object.fromEntries(songs.map((s) => [s.id, s.originalLyrics ?? ""]))
  );
  const prevSlidesPerSongRef = useRef(slidesPerSong);
  const editingRawSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    for (const song of songs) {
      if (!(song.id in originalLyricsRef.current)) {
        originalLyricsRef.current[song.id] = song.originalLyrics ?? "";
      }
    }
  }, [songs]);

  useEffect(() => {
    if (!availableModes.includes(mode)) {
      setMode(availableModes[0]);
    }
  }, [availableModes, mode]);

  useEffect(() => {
    if (headerStep === 1 && mode === "lyrics" && isEditingTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  }, [headerStep, mode, isEditingTitle]);

  const searchInFlight = songs.some((song) => song.loading);

  useEffect(() => {
    if (!searchInFlight || searchStartedAt === null) {
      setShowCancelSearch(false);
      return;
    }

    const elapsed = Date.now() - searchStartedAt;
    const remaining = Math.max(0, 8000 - elapsed);
    const timer = window.setTimeout(() => setShowCancelSearch(true), remaining);
    return () => window.clearTimeout(timer);
  }, [searchInFlight, searchStartedAt]);

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

  const focusSearchTitleInput = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const desktop = window.matchMedia("(min-width: 1280px)").matches;
        const target = desktop
          ? desktopSearchInputRef.current ?? searchInputRef.current
          : searchInputRef.current ?? desktopSearchInputRef.current;
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
        target?.focus();
      });
    });
  }, []);

  const openSearchPanel = () => {
    setMode("lyrics");
    setShowSearchPanel(true);
    setShowSongList(false);
    if (!searchInFlight) {
      setSearchQuery("");
      setSearchArtist("");
      setSearchResultSongId(null);
    }
    focusSearchTitleInput();
  };

  const selectSong = (index: number, options?: { closeTray?: boolean }) => {
    setActiveSongIndex(index);
    setShowSearchPanel(false);
    if (options?.closeTray) setShowSongList(false);
  };

  const handleAddSongFromSearch = async () => {
    const title = searchQuery.trim();
    const artistTrimmed = searchArtist.trim();
    if (!title || songs.length >= 10 || searchInFlight) return;
    const normalizedTitle = normalizeSearchText(title);

    const existingSong = findSongByNormalizedTitle(songs, title);
    const existingIndex = existingSong ? songs.findIndex((s) => s.id === existingSong.id) : -1;
    if (existingIndex >= 0) {
      setActiveSongIndex(existingIndex);
      setShowSearchPanel(false);
      setSearchResultSongId(null);
      setSearchQuery("");
      setSearchArtist("");
      return;
    }

    addSong(title, artistTrimmed);
    setSearchQuery("");
    setSearchArtist("");

    const song = usePPTStore.getState().songs.find((s) => normalizeSearchText(s.title) === normalizeSearchText(title));
    if (!song) return;

    const nextIndex = usePPTStore.getState().songs.findIndex((s) => s.id === song.id);
    setActiveSongIndex(Math.max(nextIndex, 0));
    setSearchResultSongId(song.id);
    setSongLoading(song.id, true);
    const requestId = ++searchRequestSeqRef.current;
    setSearchStartedAt(Date.now());
    setShowCancelSearch(false);

    try {
      const searchCandidates = uniqueSearchCandidates([
        artistTrimmed ? `${title} ${artistTrimmed}` : title,
        artistTrimmed ? `${title}${artistTrimmed}` : title,
        normalizeSearchText(artistTrimmed ? `${title} ${artistTrimmed}` : title),
        normalizedTitle,
      ]);

      let result: Awaited<ReturnType<typeof api.searchLyrics>> | null = null;
      for (const candidate of searchCandidates) {
        result = await api.searchLyrics(candidate, normalizedTitle);
        if (result.status === "found" && result.lyrics) break;
      }

      if (searchRequestSeqRef.current != requestId) {
        return;
      }

      if (result?.status === "found" && result.lyrics) {
        const source = (result.source as "manual" | "tavily" | "db") ?? "db";
        setSongOriginalLyrics(song.id, result.lyrics);
        setSongLyrics(song.id, result.lyrics, source);
        setEditedLyrics((prev) => ({ ...prev, [song.id]: result.lyrics! }));
        originalLyricsRef.current[song.id] = result.lyrics;
      } else {
        setSongError(song.id, true);
        setEditedLyrics((prev) => ({ ...prev, [song.id]: "" }));
      }
    } catch {
      if (searchRequestSeqRef.current !== requestId) {
        return;
      }
      setSongError(song.id, true);
      setEditedLyrics((prev) => ({ ...prev, [song.id]: "" }));
    } finally {
      if (searchRequestSeqRef.current === requestId) {
        setSearchStartedAt(null);
        setShowCancelSearch(false);
      }
      focusSearchTitleInput();
    }
  };

  const handleCancelSearch = () => {
    if (!activeSong || !activeSong.loading) return;
    searchRequestSeqRef.current += 1;
    setSearchStartedAt(null);
    setShowCancelSearch(false);
    setEditedLyrics((prev) => ({ ...prev, [activeSong.id]: prev[activeSong.id] ?? "" }));
    setSongLyrics(activeSong.id, editedLyrics[activeSong.id] ?? "", activeSong.source ?? null);
    setShowSearchPanel(false);
  };

  const handleReorderSongs = (ids: string[]) => {
    const activeId = activeSong?.id;
    reorderSongs(ids);
    const songsById = new Map(songs.map((song) => [song.id, song]));
    const allSlides: { order: number; lyrics: string; song_id: string }[] = [];
    let globalOrder = 1;

    for (const songId of ids) {
      if (!songsById.has(songId)) continue;
      for (const slide of slidesPerSong[songId] ?? []) {
        allSlides.push({ ...slide, order: globalOrder++, song_id: songId });
      }
    }

    setSlides(allSlides);
    setRawText(rawFromSlides(allSlides));
    if (activeId) {
      const nextIndex = ids.indexOf(activeId);
      if (nextIndex >= 0) setActiveSongIndex(nextIndex);
    }
  };

  const handleRemoveSong = (songId: string) => {
    const nextSongs = songs.filter((song) => song.id !== songId);
    removeSong(songId);
    setSearchResultSongId((id) => (id === songId ? null : id));
    setEditedLyrics((prev) => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    setRawTexts((prev) => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    setSlideIds((prev) => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    delete originalLyricsRef.current[songId];

    if (nextSongs.length === 0) {
      setActiveSongIndex(0);
      setShowSearchPanel(true);
      setSearchQuery("");
      setSearchArtist("");
      return;
    }

    if (songs[activeSongIndex]?.id === songId) {
      setActiveSongIndex(Math.min(activeSongIndex, nextSongs.length - 1));
    } else {
      const activeId = songs[activeSongIndex]?.id;
      const nextIndex = nextSongs.findIndex((song) => song.id === activeId);
      setActiveSongIndex(Math.max(nextIndex, 0));
    }
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
      const failedSongs: string[] = [];
      let globalOrder = 1;

      for (const song of songs) {
        const lyrics = editedLyrics[song.id];
        if (!lyrics?.trim()) continue;

        let songSlides: { order: number; lyrics: string; song_id: string }[] = [];
        try {
          const result = await api.splitSlides(lyrics);
          songSlides = result.slides
            .map((slide: { lyrics: string }, i: number) => ({
              order: i + 1,
              lyrics: slide.lyrics,
              song_id: song.id,
            }))
            .filter((slide) => slide.lyrics.trim().length > 0);

          if (songSlides.length === 0) {
            throw new Error("empty split result");
          }
          setSongSlideSplitFailed(song.id, false);
        } catch (error) {
          console.error(`AI 슬라이드 구분 실패: ${song.title}`, error);
          failedSongs.push(song.title);
          songSlides = slidesFromRaw(lyrics).map((slide, i) => ({
            order: i + 1,
            lyrics: slide.lyrics,
            song_id: song.id,
          }));

          if (songSlides.length === 0) {
            songSlides = [{ order: 1, lyrics: lyrics.trim(), song_id: song.id }];
          }
          setSongSlideSplitFailed(song.id, true);
        }

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

      if (failedSongs.length > 0) {
        alert(`다음 곡은 AI 슬라이드 구분에 실패해서 수동 모드로 열립니다:\n\n${failedSongs.map((title) => `• ${title}`).join("\n")}`);
      }
      router.push(nextHref);
    } catch (e) {
      console.error("AI 슬라이드 구분 실패:", e);
    } finally {
      setAiLoading(false);
    }
  }, [songs, editedLyrics, setSongLyrics, setSongOriginalLyrics, setSongSlideSplitFailed, setSlidesForSong, setSlides, setRawText, router, nextHref]);

  function syncAllSlides(updatedSongId: string, updatedSlides: { order: number; lyrics: string }[]) {
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
  }

  function handleRawTextChange(songId: string, text: string) {
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
  }

  async function handleRerunAI(songId: string, lyrics: string) {
    setAiLoading(true);
    try {
      const result = await api.splitSlides(lyrics);
      const songSlides = result.slides
        .map((slide: { lyrics: string }, i: number) => ({
          order: i + 1,
          lyrics: slide.lyrics,
        }))
        .filter((slide) => slide.lyrics.trim().length > 0);

      if (songSlides.length === 0) {
        throw new Error("empty split result");
      }

      setSlidesForSong(songId, songSlides);
      setSongSlideSplitFailed(songId, false);
      setSlideIds((prev) => ({
        ...prev,
        [songId]: songSlides.map((_: unknown, i: number) => `${songId}-slide-${i}`),
      }));
      syncAllSlides(songId, songSlides);
    } catch (e) {
      console.error("AI 재구분 실패:", e);
      const fallbackSlides = slidesFromRaw(lyrics);
      const nextSlides = fallbackSlides.length > 0 ? fallbackSlides : [{ order: 1, lyrics: lyrics.trim() }];
      setSlidesForSong(songId, nextSlides);
      setSongSlideSplitFailed(songId, true);
      setSlideIds((prev) => ({
        ...prev,
        [songId]: nextSlides.map((_: unknown, i: number) => `${songId}-slide-${i}`),
      }));
      syncAllSlides(songId, nextSlides);

      const failedSong = songs.find((song) => song.id === songId);
      alert(`${failedSong?.title ?? "이 곡"}의 AI 슬라이드 구분에 실패했습니다.\n\n수동 편집 모드로 전환했으니 가사를 직접 나눠주세요.`);
    } finally {
      setAiLoading(false);
    }
  }

  const handleDragEnd = (songId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = getSlideIdsForSong(songId);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
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
  const showMobileAddSong = headerStep === 1 && mode === "lyrics";
  const step1Redesign = headerStep === 1 && availableModes.length === 1 && availableModes[0] === "lyrics" && !showModeTabs;
  const step2Redesign = headerStep === 2 && availableModes.length === 1 && availableModes[0] === "slides" && !showModeTabs;
  const step1MobileNeedsPageScroll = step1Redesign;
  const step2MobileNeedsPageScroll = step2Redesign;
  const pageScrollClass = step1Redesign
    ? "overflow-y-auto overflow-x-hidden"
    : step2MobileNeedsPageScroll
    ? "overflow-y-auto overflow-x-hidden xl:overflow-hidden"
    : "overflow-hidden";
  const canProceedToSlides =
    songs.length > 0 &&
    songs.every((song) => song.title.trim().length > 0 && (editedLyrics[song.id] ?? "").trim().length > 0) &&
    !searchInFlight &&
    !aiLoading;
  const canUseLyricsActions =
    !!activeSong &&
    !activeSong.loading &&
    (editedLyrics[activeSong.id] ?? "").trim().length > 0 &&
    activeLyricsEditorSongId === activeSong.id;

  const getSlideIdsForSong = (songId: string) => {
    const slides = slidesPerSong[songId] ?? [];
    const ids = slideIds[songId];
    if (ids && ids.length === slides.length) return ids;
    return slides.map((_, i) => `${songId}-slide-${i}`);
  };

  useEffect(() => {
    setIsEditingTitle(false);
    setTitleDraft(activeSong?.title ?? "");
    setActiveLyricsEditorSongId(null);
  }, [activeSong?.id]);

  useEffect(() => {
    setSlideIds((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const song of songs) {
        const slides = slidesPerSong[song.id] ?? [];
        const ids = prev[song.id];
        if (!ids || ids.length !== slides.length) {
          next[song.id] = slides.map((_, i) => `${song.id}-slide-${i}`);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [songs, slidesPerSong]);

  useEffect(() => {
    if (!showSearchPanel || !step1Redesign) return;
    focusSearchTitleInput();
  }, [showSearchPanel, step1Redesign, focusSearchTitleInput]);

  useEffect(() => {
    if (activeSong) return;
    setShowMobileTools(false);
  }, [activeSong?.id]);

  useEffect(() => {
    if (songs.length <= 1) {
      setShowSongList(false);
    }
  }, [songs.length]);

  useEffect(() => {
    setShowLyricsNotice(!getLyricsNoticeDismissed());
  }, []);

  const applyLyricsChange = (updater: (text: string) => string) => {
    if (!activeSong) return;
    const current = editedLyrics[activeSong.id] ?? "";
    handleLyricsChange(activeSong.id, updater(current));
  };

  const restoreOriginalLyrics = () => {
    if (!activeSong) return;
    handleLyricsChange(activeSong.id, originalLyricsRef.current[activeSong.id] ?? "");
  };

  const startTitleEdit = () => {
    if (headerStep !== 1 || mode !== "lyrics" || !activeSong) return;
    setTitleDraft(activeSong.title);
    setIsEditingTitle(true);
  };

  const cancelTitleEdit = () => {
    setTitleDraft(activeSong?.title ?? "");
    setIsEditingTitle(false);
  };

  const saveTitleEdit = () => {
    if (!activeSong) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(activeSong.title);
      setIsEditingTitle(false);
      return;
    }
    updateSongTitle(activeSong.id, nextTitle);
    setIsEditingTitle(false);
  };

  return (
    <div
      className={`h-screen flex flex-col ${pageScrollClass}`}
      style={{ background: step1Redesign || step2Redesign ? "#ECEEE9" : "#F2F7F0" }}
    >
      <Header step={headerStep} />

      {showModeTabs && availableModes.length > 1 ? (
        <div
          className="flex items-center gap-0 px-6 relative overflow-hidden"
          style={{ background: "white", borderBottom: "1px solid #D8EBD0" }}
        >
          <HillDecoration />
          {[
            { key: "lyrics" as Mode, label: "가사 검색", icon: <FileText size={13} /> },
            { key: "slides" as Mode, label: "슬라이드 편집", icon: <Music size={13} />, count: totalSlides },
          ].filter((tab) => availableModes.includes(tab.key)).map((tab) => {
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
                    className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(46,94,62,0.1)", color: "#2E5E3E" }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

        </div>
      ) : null}

      {songs.length > 0 && (
        <MobileSongSwitcher
          songs={songs}
          activeSongIndex={activeSongIndex}
          setActiveSongIndex={selectSong}
          slidesPerSong={slidesPerSong}
          showCount={mode === "slides"}
          showAddSong={showMobileAddSong}
          step1Redesign={step1Redesign || step2Redesign}
          isOpen={showSongList}
          onToggle={() => setShowSongList((v) => !v)}
          onAddSong={openSearchPanel}
          onRemoveSong={handleRemoveSong}
          onReorderSongs={handleReorderSongs}
        />
      )}

      {/* Main content */}
      <main className={step1Redesign ? `flex-none flex flex-col xl:grid xl:grid-cols-[280px_minmax(0,1fr)_320px] ${showMobileTools || showSongList ? "pb-72 sm:pb-64" : "pb-44 sm:pb-48"} xl:pb-32` : step2Redesign ? "flex-none xl:flex-1 xl:min-h-0 flex flex-col xl:grid xl:grid-cols-[280px_minmax(0,1fr)_360px] pb-72 sm:pb-64 xl:pb-24" : "flex-1 flex overflow-hidden min-h-0"}>

        {/* ── 가사 검색 모드 ── */}
        {availableModes.includes("lyrics") && mode === "lyrics" && (
          <>
            <SongSidebar
              songs={songs}
              activeSongIndex={activeSongIndex}
              setActiveSongIndex={selectSong}
              slidesPerSong={slidesPerSong}
              showCount={false}
              width={step1Redesign ? 280 : sidebarLyrics.size}
              step1Redesign={step1Redesign}
              onAddSong={openSearchPanel}
              onRemoveSong={handleRemoveSong}
              onReorderSongs={handleReorderSongs}
            />
            {!step1Redesign && (
              <div className="hidden lg:block">
                <Divider onMouseDown={sidebarLyrics.onMouseDown} />
              </div>
            )}

            <section className={step1Redesign ? "min-w-0 flex flex-col" : "flex-1 flex flex-col min-w-0 relative"} style={{ background: step1Redesign ? "transparent" : "white" }}>
              {step1Redesign ? (
                <div className="flex-1 px-4 sm:px-6 py-5 sm:py-6 overflow-visible">
                  <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    {(showSearchPanel || !activeSong) && (
                      <div className="xl:hidden">
                        <SongSearchPanel
                          query={searchQuery}
                          artist={searchArtist}
                          songsCount={songs.length}
                          searchLocked={searchInFlight}
                          showCancelSearch={showCancelSearch}
                          step1Redesign
                          showCloseButton={!!activeSong}
                          resultSong={undefined}
                          inputRef={searchInputRef}
                          artistInputRef={artistInputRef}
                          onQueryChange={setSearchQuery}
                          onArtistChange={setSearchArtist}
                          onAddSong={handleAddSongFromSearch}
                          onCancelSearch={handleCancelSearch}
                          onClose={() => setShowSearchPanel(false)}
                        />
                      </div>
                    )}

                    <div
                      className={`${activeSong ? "flex" : "hidden xl:flex"} rounded-[28px] overflow-hidden flex-col`}
                      style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 48px rgba(20,26,22,0.08)" }}
                    >
                      <div className="hidden xl:block px-5 sm:px-6 py-5 border-b" style={{ borderColor: "#DFE3DD" }}>
                        <div className="flex items-end justify-between gap-3 mb-4">
                          <div>
                            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#7D867F" }}>
                              곡 검색
                            </p>
                            <p className="text-[13px] sm:text-sm mt-1" style={{ color: "#616A62" }}>
                              아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
                            </p>
                          </div>
                          <p className="text-[11px] sm:text-xs font-medium shrink-0" style={{ color: "#7B857C" }}>
                            최대 10곡
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3">
                          <label className="flex items-center gap-3 rounded-[20px] px-4 py-3.5" style={{ background: "#FFFFFF", border: "1px solid #CDD3CC" }}>
                            <Search size={16} style={{ color: "#6B746C" }} />
                            <input
                              ref={desktopSearchInputRef}
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault();
                                  requestAnimationFrame(() => desktopArtistInputRef.current?.focus());
                                  return;
                                }
                                if (e.key === "Enter") e.preventDefault();
                              }}
                              onKeyUp={(e) => {
                                if (e.key === "Enter") handleAddSongFromSearch();
                              }}
                              placeholder="곡명 (예: 베드로의 고백)"
                              disabled={songs.length >= 10}
                              className="w-full bg-transparent text-[13px] sm:text-sm focus:outline-none"
                              style={{ color: "#151A16" }}
                            />
                          </label>
                          <label className="flex items-center rounded-[20px] px-4 py-3.5" style={{ background: "#FFFFFF", border: "1px solid #CDD3CC" }}>
                            <input
                              ref={desktopArtistInputRef}
                              type="text"
                              value={searchArtist}
                              onChange={(e) => setSearchArtist(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.preventDefault();
                              }}
                              onKeyUp={(e) => {
                                if (e.key === "Enter") handleAddSongFromSearch();
                              }}
                              placeholder="아티스트 (선택)"
                              disabled={songs.length >= 10}
                              className="w-full bg-transparent text-[13px] sm:text-sm focus:outline-none"
                              style={{ color: "#151A16" }}
                            />
                          </label>
                          <button
                            onClick={handleAddSongFromSearch}
                            disabled={!searchQuery.trim() || songs.length >= 10 || searchInFlight}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[20px] text-[13px] sm:text-sm font-semibold text-white disabled:opacity-40"
                            style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.18)" }}
                          >
                            <Plus size={16} />
                            곡 추가
                          </button>
                        </div>
                      </div>

                      {activeSong ? (
                        <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
                          <div className="min-w-0">
                            {headerStep === 1 && isEditingTitle ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  ref={titleInputRef}
                                  value={titleDraft}
                                  onChange={(e) => setTitleDraft(e.target.value)}
                                  onBlur={saveTitleEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveTitleEdit();
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelTitleEdit();
                                    }
                                  }}
                                  className="text-sm font-bold rounded-lg px-2 py-1 min-w-0 w-full sm:w-72"
                                  style={{ color: "#1a3824", background: "#F2F7F0", border: "1px solid #D8EBD0", outline: "none" }}
                                />
                                <button onClick={saveTitleEdit} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg grid place-items-center transition-colors" style={{ color: "#2E5E3E", background: "rgba(46,94,62,0.08)" }} aria-label="제목 저장">
                                  <Check size={14} />
                                </button>
                                <button onClick={cancelTitleEdit} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg grid place-items-center transition-colors" style={{ color: "#86C59A", background: "rgba(214,240,219,0.4)" }} aria-label="제목 취소">
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#7D867F" }}>
                                  가사 편집
                                </p>
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                  <span className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] truncate" style={{ color: "#151A16" }}>
                                    {activeSong.title}
                                  </span>
                                  {headerStep === 1 && !activeSong.loading && (
                                    <button onClick={startTitleEdit} className="w-9 h-9 rounded-xl grid place-items-center transition-colors" style={{ background: "#EBEEEA", color: "#223B2A" }} aria-label="제목 수정">
                                      <PencilLine size={15} />
                                    </button>
                                  )}
                                </div>
                                {activeSong.source && activeSong.source !== "manual" && showLyricsNotice && !activeSong.loading && (
                                  <div className="mt-2 flex items-start gap-2 text-[13px] sm:text-sm leading-relaxed max-w-xl" style={{ color: "#616A62" }}>
                                    <p>웹에서 불러온 가사예요. 한번 확인해 주세요.</p>
                                    <button
                                      onClick={() => {
                                        setShowLyricsNotice(false);
                                        setLyricsNoticeDismissed(true);
                                      }}
                                      className="w-5 h-5 rounded-md grid place-items-center flex-shrink-0 transition-colors"
                                      style={{ color: "#86A88E", background: "rgba(242,247,240,0.95)" }}
                                      aria-label="가사 안내 닫기"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {activeSong.loading ? (
                            <div className="rounded-[24px] overflow-hidden border h-[420px] flex items-center justify-center px-5 text-center" style={{ background: "#FFFFFF", borderColor: "#D6DAD3" }}>
                              <div className="max-w-sm">
                                <Loader2 size={24} className="animate-spin mx-auto mb-4" style={{ color: "#2E5E3E" }} />
                                <p className="text-sm font-semibold" style={{ color: "#151A16" }}>가사를 검색하고 있습니다.</p>
                                <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "#616A62" }}>검색 중에는 같은 곡을 편집하지 않도록 잠시 잠급니다.</p>
                                {showCancelSearch && (
                                  <button
                                    onClick={handleCancelSearch}
                                    className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                                    style={{ background: "#EEF2EC", border: "1px solid #D6DAD3", color: "#223B2A" }}
                                  >
                                    검색 취소하고 직접 입력하기
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[24px] overflow-hidden border h-[420px] flex" style={{ background: "#FFFFFF", borderColor: "#D6DAD3" }}>
                              <LyricsEditor
                                songId={activeSong.id}
                                text={editedLyrics[activeSong.id] ?? ""}
                                step1Redesign
                              onChange={(t) => handleLyricsChange(activeSong.id, t)}
                              onActivate={() => setActiveLyricsEditorSongId(activeSong.id)}
                              onUndo={() => {
                                  const prev = lyricsHistory.undo();
                                  if (prev) {
                                    const text = prev[activeSong.id] ?? "";
                                    const song = songs.find((s) => s.id === activeSong.id);
                                    setSongLyrics(activeSong.id, text, song?.source ?? null);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="hidden xl:flex px-6 py-16 min-h-[360px] items-center justify-center text-center">
                          <div>
                            <p className="text-[18px] font-semibold tracking-[-0.01em]" style={{ color: "#151A16" }}>곡을 추가하면 가사를 편집할 수 있어요.</p>
                            <p className="text-sm mt-2" style={{ color: "#616A62" }}>위 검색창에서 곡명을 입력해 주세요.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {!activeSong || showSearchPanel ? (
                    <SongSearchPanel
                      query={searchQuery}
                      artist={searchArtist}
                      songsCount={songs.length}
                      searchLocked={searchInFlight}
                      showCancelSearch={showCancelSearch}
                      resultSong={songs.find((s) => s.id === searchResultSongId)}
                      inputRef={searchInputRef}
                      artistInputRef={artistInputRef}
                      onQueryChange={setSearchQuery}
                      onArtistChange={setSearchArtist}
                      onAddSong={handleAddSongFromSearch}
                      onCancelSearch={handleCancelSearch}
                    />
                  ) : activeSong ? (
                    <>
                      <div
                        className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between relative z-10"
                        style={{ borderBottom: "1px solid #F2F7F0" }}
                      >
                        <div className="flex items-center gap-2.5">
                          {headerStep === 1 && mode === "lyrics" && isEditingTitle ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                ref={titleInputRef}
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={saveTitleEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveTitleEdit();
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelTitleEdit();
                                  }
                                }}
                                className="text-sm font-bold rounded-lg px-2 py-1 min-w-0 w-full sm:w-72"
                                style={{ color: "#1a3824", background: "#F2F7F0", border: "1px solid #D8EBD0", outline: "none" }}
                              />
                              <button onClick={saveTitleEdit} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg grid place-items-center transition-colors" style={{ color: "#2E5E3E", background: "rgba(46,94,62,0.08)" }} aria-label="제목 저장">
                                <Check size={14} />
                              </button>
                              <button onClick={cancelTitleEdit} onMouseDown={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg grid place-items-center transition-colors" style={{ color: "#86C59A", background: "rgba(214,240,219,0.4)" }} aria-label="제목 취소">
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm font-bold truncate" style={{ color: "#1a3824" }}>
                                  {activeSong.title}
                                </span>
                                {headerStep === 1 && mode === "lyrics" && (
                                  <button onClick={startTitleEdit} className="w-7 h-7 rounded-lg grid place-items-center transition-colors" style={{ color: "#2E5E3E", background: "rgba(46,94,62,0.08)" }} aria-label="제목 수정">
                                    <PencilLine size={13} />
                                  </button>
                                )}
                              </div>
                              {activeSong.source && activeSong.source !== "manual" && showLyricsNotice && (
                                <div className="mt-1.5 flex items-start gap-2 text-xs" style={{ color: "#6B7F72" }}>
                                  <p>웹에서 불러온 가사예요. 한번 확인해 주세요.</p>
                                  <button
                                    onClick={() => {
                                      setShowLyricsNotice(false);
                                      setLyricsNoticeDismissed(true);
                                    }}
                                    className="w-5 h-5 rounded-md grid place-items-center flex-shrink-0 transition-colors"
                                    style={{ color: "#86A88E", background: "rgba(242,247,240,0.95)" }}
                                    aria-label="가사 안내 닫기"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {activeSong.artist && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium w-fit" style={{ background: "rgba(46,94,62,0.08)", color: "#2E5E3E" }}>
                              {activeSong.artist}
                            </span>
                          )}
                        </div>
                      </div>

                      <LyricsEditor
                        songId={activeSong.id}
                        text={editedLyrics[activeSong.id] ?? ""}
                        onChange={(t) => handleLyricsChange(activeSong.id, t)}
                        onActivate={() => setActiveLyricsEditorSongId(activeSong.id)}
                        onUndo={() => {
                          const prev = lyricsHistory.undo();
                          if (prev) {
                            const text = prev[activeSong.id] ?? "";
                            const song = songs.find((s) => s.id === activeSong.id);
                            setSongLyrics(activeSong.id, text, song?.source ?? null);
                          }
                        }}
                      />

                      <div className="lg:hidden px-4 py-3 flex flex-wrap gap-2 border-t" style={{ borderColor: "#F2F7F0", background: "#FCFEFA" }}>
                        {[
                          { label: "원본 복원", onClick: restoreOriginalLyrics },
                          { label: "중복 제거", onClick: () => applyLyricsChange(removeDuplicateLines) },
                          { label: "줄 번호 정리", onClick: () => applyLyricsChange(renumberLines) },
                          { label: "빈 줄 정리", onClick: () => applyLyricsChange(cleanBlankLines) },
                          { label: "영어 삭제", onClick: () => applyLyricsChange(removeEnglishLines) },
                          { label: "괄호 삭제", onClick: () => applyLyricsChange(removeParenthesesText) },
                        ].map((action) => (
                          <button key={action.label} onClick={action.onClick} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}>
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </section>

            {/* 우측 패널 */}
            {(step1Redesign || (!step1Redesign && !showSearchPanel && activeSong)) && (
              <>
                {!step1Redesign && (
                  <div className="hidden lg:flex">
                    <Divider onMouseDown={rightPanel.onMouseDown} />
                  </div>
                )}
                <RightPanel
                  song={activeSong}
                  width={step1Redesign ? 320 : rightPanel.size}
                  step1Redesign={step1Redesign}
                  onPrimaryAction={handleRunAI}
                  primaryActionLabel="슬라이드 편집"
                  primaryActionIcon={aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  primaryActionDisabled={!canProceedToSlides}
                  lyricsActionsDisabled={step1Redesign ? !canUseLyricsActions : false}
                  onRestoreOriginal={restoreOriginalLyrics}
                  onRemoveDuplicates={() => applyLyricsChange(removeDuplicateLines)}
                  onRenumberLines={() => applyLyricsChange(renumberLines)}
                  onCleanBlankLines={() => applyLyricsChange(cleanBlankLines)}
                  onRemoveEnglish={() => applyLyricsChange(removeEnglishLines)}
                  onRemoveParentheses={() => applyLyricsChange(removeParenthesesText)}
                />
              </>
            )}
          </>
        )}

        {/* ── 슬라이드 편집 모드 ── */}
        {availableModes.includes("slides") && mode === "slides" && (
          <>
            <SongSidebar
              songs={songs}
              activeSongIndex={activeSongIndex}
              setActiveSongIndex={selectSong}
              slidesPerSong={slidesPerSong}
              showCount={true}
              width={step2Redesign ? 280 : sidebarSlides.size}
              step1Redesign={step2Redesign}
              onRemoveSong={handleRemoveSong}
              onReorderSongs={handleReorderSongs}
            />
            {!step2Redesign && (
              <div className="hidden lg:block">
                <Divider onMouseDown={sidebarSlides.onMouseDown} />
              </div>
            )}

            {activeSong && (
              <>
                {/* 가운데: 텍스트 에디터 */}
                <div
                  className={step2Redesign ? "flex-1 min-w-0 flex flex-col m-4 sm:m-6 xl:my-3 xl:ml-6 xl:mr-4 rounded-[28px] overflow-hidden" : "flex-1 flex flex-col min-w-0"}
                  style={step2Redesign ? { background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 48px rgba(20,26,22,0.08)" } : { borderRight: "1px solid #D8EBD0", background: "white" }}
                >
                  <div
                    className={step2Redesign ? "px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4 justify-between" : "px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between"}
                    style={{ borderBottom: step2Redesign ? "1px solid #DFE3DD" : "1px solid #F2F7F0" }}
                  >
                    <div className="min-w-0 flex-1">
                      {step2Redesign && (
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: "#7D867F" }}>
                          슬라이드 편집
                        </p>
                      )}
                      <div className={step2Redesign ? "flex flex-wrap items-center gap-2" : ""}>
                        <span className={step2Redesign ? "text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] truncate" : "text-sm font-bold truncate block sm:inline"} style={{ color: step2Redesign ? "#151A16" : "#1a3824" }}>
                          {activeSong.title}
                        </span>
                        <span className={step2Redesign ? "text-xs px-2.5 py-1 rounded-full font-medium" : "text-xs ml-2"} style={step2Redesign ? { color: "#4F5C52", background: "#EBEEEA" } : { color: "#86C59A" }}>
                          <code style={{ color: step2Redesign ? "#223B2A" : "#2E5E3E", fontWeight: 700 }}>//</code>
                          {" "}로 슬라이드 구분
                        </span>
                      </div>
                      {activeSong.slideSplitFailed && (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl mt-2 sm:mt-0 sm:ml-3"
                          style={step2Redesign ? { background: "#FFF7E6", color: "#8A4B10", border: "1px solid #F3D7A1" } : { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                        >
                          <AlertTriangle size={12} />
                          AI 구분 실패, 수동 편집 필요
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRerunAI(activeSong.id, editedLyrics[activeSong.id] ?? "")}
                      disabled={aiLoading}
                      className={step2Redesign ? "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold shrink-0 transition-all disabled:opacity-40" : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ml-3 transition-all disabled:opacity-40"}
                      style={step2Redesign ? { background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#223B2A" } : { background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
                    >
                      {aiLoading
                        ? <Loader2 size={12} className="animate-spin" />
                        : <RefreshCw size={12} />
                      }
                      <span className="hidden sm:inline">AI</span> 재구분
                    </button>
                  </div>

                  {aiLoading ? (
                    <div className={step2Redesign ? "flex-1 min-h-[420px] flex items-center justify-center px-8 sm:px-12 py-16 sm:py-20" : "flex-1 flex items-center justify-center"} style={{ background: step2Redesign ? "#FFFFFF" : "#F2F7F0" }}>
                      <div className={step2Redesign ? "text-center max-w-[280px] sm:max-w-sm mx-auto" : "text-center"}>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                          style={{ background: step2Redesign ? "#EEF2EC" : "rgba(46,94,62,0.1)" }}
                        >
                          <Loader2 size={20} className="animate-spin" style={{ color: step2Redesign ? "#223B2A" : "#2E5E3E" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: step2Redesign ? "#151A16" : "#1a3824" }}>AI가 슬라이드를 구분하고 있습니다...</p>
                        <p className="text-xs mt-1" style={{ color: step2Redesign ? "#616A62" : "#86C59A" }}>잠시만 기다려주세요</p>
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
                    className={step2Redesign ? "flex-1 min-h-[420px] px-5 sm:px-6 py-5 text-[15px] sm:text-[16px] resize-none focus:outline-none leading-relaxed" : "flex-1 px-4 sm:px-5 py-4 text-sm resize-none focus:outline-none leading-relaxed"}
                    style={{ background: step2Redesign ? "#FFFFFF" : "#F2F7F0", color: step2Redesign ? "#151A16" : "#1a3824", fontFamily: '"Pretendard", sans-serif' }}
                    spellCheck={false}
                  />
                  )}

                  <div className={step2Redesign ? `xl:hidden border-t px-5 ${showMobileSlideList ? "py-4" : "py-3"}` : "lg:hidden border-t px-4 py-3"} style={{ borderColor: step2Redesign ? "#DFE3DD" : "#D8EBD0", background: step2Redesign ? "#F8F8F5" : "white" }}>
                    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${showMobileSlideList ? "mb-3" : "mb-0"}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={step2Redesign ? "text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em]" : "text-xs font-semibold uppercase tracking-widest"} style={{ color: step2Redesign ? "#7D867F" : "#86C59A" }}>
                            슬라이드 목록
                          </span>
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: step2Redesign ? "#EBEEEA" : "rgba(46,94,62,0.1)", color: step2Redesign ? "#223B2A" : "#2E5E3E" }}
                          >
                            {(slidesPerSong[activeSong.id] ?? []).length}
                          </span>
                        </div>
                        {step2Redesign && !showMobileSlideList && (
                          <p className="text-xs mt-1.5" style={{ color: "#616A62" }}>
                            목록을 접어두었습니다.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {step2Redesign && (
                          <button
                            onClick={() => setShowMobileSlideList((prev) => !prev)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1"
                            style={{ border: "1px solid #CDD3CC", color: "#223B2A", background: "#FFFFFF" }}
                          >
                            {showMobileSlideList ? "목록 접기" : "목록 보기"}
                            {showMobileSlideList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleAddSlide(activeSong.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{ border: step2Redesign ? "1px solid #CDD3CC" : "1px solid #D8EBD0", color: step2Redesign ? "#223B2A" : "#2E5E3E", background: step2Redesign ? "#FFFFFF" : "#F2F7F0" }}
                        >
                          슬라이드 추가
                        </button>
                      </div>
                    </div>
                    {(!step2Redesign || showMobileSlideList) && (
                      <div className={step2Redesign ? "flex flex-col gap-3 overflow-visible pr-1" : "flex flex-col gap-3 max-h-64 overflow-y-auto pr-1"}>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(activeSong.id, e)}
                        >
                          <SortableContext
                            items={getSlideIdsForSong(activeSong.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="flex flex-col gap-3">
                              {(slidesPerSong[activeSong.id] ?? []).map((slide, i) => {
                                const ids = getSlideIdsForSong(activeSong.id);
                                return (
                                  <SlideCard
                                    key={ids[i] || `${activeSong.id}-mobile-slide-${i}`}
                                    id={ids[i] || `${activeSong.id}-mobile-slide-${i}`}
                                    order={slide.order}
                                    lyrics={slide.lyrics}
                                    isActive={false}
                                    onClick={() => {}}
                                    onRemove={() => handleRemoveSlide(activeSong.id, i)}
                                    onInsertBefore={() => handleInsertSlide(activeSong.id, i)}
                                    onInsertAfter={() => handleInsertSlide(activeSong.id, i + 1)}
                                    variant={step2Redesign ? "redesign" : "default"}
                                  />
                                );
                              })}
                              {(slidesPerSong[activeSong.id] ?? []).length === 0 && (
                                <div className="rounded-2xl px-4 py-8 text-center text-sm" style={{ background: "#FFFFFF", border: "1px dashed #C8D0C7", color: "#5B645D" }}>
                                  아직 슬라이드가 없어요.
                                </div>
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 슬라이드 목록 */}
                {!step2Redesign && (
                  <div className="hidden lg:flex">
                    <Divider onMouseDown={rightPanel.onMouseDown} />
                  </div>
                )}
                <div
                  className={step2Redesign ? "hidden xl:flex flex-shrink-0 flex-col my-3 ml-8 mr-14 rounded-[28px] overflow-hidden" : "hidden lg:flex flex-shrink-0 flex-col"}
                  style={step2Redesign ? { width: 312, background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 42px rgba(20,26,22,0.06)" } : { width: rightPanel.size, background: "white" }}
                >
                  <div className={step2Redesign ? "px-5 py-5" : "px-4 py-3"} style={{ borderBottom: step2Redesign ? "1px solid #DFE3DD" : "1px solid #F2F7F0" }}>
                    <span className={step2Redesign ? "text-xs font-semibold uppercase tracking-widest" : "text-xs font-semibold uppercase tracking-widest"} style={{ color: step2Redesign ? "#7D867F" : "#86C59A" }}>
                      슬라이드 목록
                    </span>
                    {step2Redesign && (
                      <h3 className="text-[20px] font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>
                        {(slidesPerSong[activeSong.id] ?? []).length}개 슬라이드
                      </h3>
                    )}
                    <span
                      className={step2Redesign ? "hidden" : "ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full"}
                      style={{ background: "rgba(46,94,62,0.1)", color: "#2E5E3E" }}
                    >
                      {(slidesPerSong[activeSong.id] ?? []).length}
                    </span>
                  </div>
                  <div className={step2Redesign ? "flex-1 overflow-y-auto p-4" : "flex-1 overflow-y-auto p-3"}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(activeSong.id, e)}
                    >
                      <SortableContext
                        items={getSlideIdsForSong(activeSong.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-3">
                          {(slidesPerSong[activeSong.id] ?? []).map((slide, i) => {
                            const ids = getSlideIdsForSong(activeSong.id);
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
                                variant={step2Redesign ? "redesign" : "default"}
                              />
                            );
                          })}
                          {(slidesPerSong[activeSong.id] ?? []).length === 0 && (
                            <div className="rounded-2xl px-4 py-8 text-center text-sm" style={{ background: "#FFFFFF", border: "1px dashed #C8D0C7", color: "#5B645D" }}>
                              아직 슬라이드가 없어요.
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <button
                      onClick={() => handleAddSlide(activeSong.id)}
                      className={step2Redesign ? "mt-4 w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all" : "mt-3 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"}
                      style={step2Redesign ? { border: "1px dashed #C8D0C7", color: "#253029", background: "#FFFFFF" } : { border: "1.5px dashed #D8EBD0", color: "#86C59A" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = step2Redesign ? "#9FA99E" : "#2E5E3E";
                        e.currentTarget.style.color = step2Redesign ? "#151A16" : "#2E5E3E";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = step2Redesign ? "#C8D0C7" : "#D8EBD0";
                        e.currentTarget.style.color = step2Redesign ? "#253029" : "#86C59A";
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

      {step1Redesign ? (
        <>
          {mode === "lyrics" && (
            <>
              <div className="fixed inset-x-0 bottom-4 px-4 pointer-events-none z-40 sm:hidden">
                <div className="max-w-7xl mx-auto flex flex-col gap-3 pointer-events-auto">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowMobileTools((prev) => !prev)}
                      disabled={!activeSong}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[11px] font-semibold"
                      style={{ background: "rgba(248,248,245,0.96)", border: "1px solid rgba(214,218,211,0.98)", color: "#253029", boxShadow: "0 16px 32px rgba(20,26,22,0.1)", backdropFilter: "blur(16px)", opacity: activeSong ? 1 : 0.45 }}
                    >
                      <Wand2 size={13} />
                      {activeSong && showMobileTools ? "도구 접기" : "가사 관리"}
                    </button>
                  </div>
                  {showMobileTools && activeSong && (
                    <div className="rounded-[24px] px-4 py-3" style={{ background: "rgba(248,248,245,0.94)", border: "1px solid rgba(214,218,211,0.98)", boxShadow: "0 20px 36px rgba(20,26,22,0.1)", backdropFilter: "blur(16px)" }}>
                      <div className="flex gap-2 overflow-x-auto">
                        {[
                          { label: "원본 복원", onClick: restoreOriginalLyrics },
                          { label: "중복 제거", onClick: () => applyLyricsChange(removeDuplicateLines) },
                          { label: "줄 번호 정리", onClick: () => applyLyricsChange(renumberLines) },
                          { label: "빈 줄 정리", onClick: () => applyLyricsChange(cleanBlankLines) },
                          { label: "영어 삭제", onClick: () => applyLyricsChange(removeEnglishLines) },
                          { label: "괄호 삭제", onClick: () => applyLyricsChange(removeParenthesesText) },
                        ].map((action) => (
                          <button
                            key={action.label}
                            onClick={action.onClick}
                            className="px-3 py-2 rounded-xl text-[11px] font-semibold shrink-0"
                            style={{ background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#253029" }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-3.5 py-3 flex items-center justify-between gap-2.5 rounded-[24px]" style={{ background: "rgba(246,247,244,0.92)", border: "1px solid rgba(211,216,208,0.95)", boxShadow: "0 20px 40px rgba(20,26,22,0.12)", backdropFilter: "blur(16px)" }}>
                    <button
                      onClick={() => router.push(backHref)}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-[12px] font-semibold flex-1"
                      style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
                    >
                      <ArrowLeft size={15} />
                      이전
                    </button>
                    <button
                      onClick={handleRunAI}
                      disabled={!canProceedToSlides}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-[12px] font-semibold text-white flex-1 disabled:opacity-40"
                      style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
                    >
                      {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                      슬라이드 편집
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block xl:hidden fixed inset-x-0 bottom-4 px-6 pointer-events-none z-40">
                <div className="max-w-7xl mx-auto flex flex-col gap-3 pointer-events-auto">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowMobileTools((prev) => !prev)}
                      disabled={!activeSong}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold"
                      style={{ background: "rgba(248,248,245,0.96)", border: "1px solid rgba(214,218,211,0.98)", color: "#253029", boxShadow: "0 16px 32px rgba(20,26,22,0.1)", backdropFilter: "blur(16px)", opacity: activeSong ? 1 : 0.45 }}
                    >
                      <Wand2 size={14} />
                      {activeSong && showMobileTools ? "도구 접기" : "가사 관리"}
                    </button>
                  </div>
                  {showMobileTools && activeSong && (
                    <div className="rounded-[24px] px-5 py-3" style={{ background: "rgba(248,248,245,0.94)", border: "1px solid rgba(214,218,211,0.98)", boxShadow: "0 20px 36px rgba(20,26,22,0.1)", backdropFilter: "blur(16px)" }}>
                      <div className="flex gap-2 overflow-x-auto">
                        {[
                          { label: "원본 복원", onClick: restoreOriginalLyrics },
                          { label: "중복 제거", onClick: () => applyLyricsChange(removeDuplicateLines) },
                          { label: "줄 번호 정리", onClick: () => applyLyricsChange(renumberLines) },
                          { label: "빈 줄 정리", onClick: () => applyLyricsChange(cleanBlankLines) },
                          { label: "영어 삭제", onClick: () => applyLyricsChange(removeEnglishLines) },
                          { label: "괄호 삭제", onClick: () => applyLyricsChange(removeParenthesesText) },
                        ].map((action) => (
                          <button
                            key={action.label}
                            onClick={action.onClick}
                            className="px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                            style={{ background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#253029" }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-5 py-3.5 flex items-center justify-between gap-3 rounded-[24px]" style={{ background: "rgba(246,247,244,0.92)", border: "1px solid rgba(211,216,208,0.95)", boxShadow: "0 20px 40px rgba(20,26,22,0.12)", backdropFilter: "blur(16px)" }}>
                    <button
                      onClick={() => router.push(backHref)}
                      className="inline-flex min-w-0 items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold flex-1"
                      style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
                    >
                      <ArrowLeft size={15} />
                      이전
                    </button>
                    <button
                      onClick={handleRunAI}
                      disabled={!canProceedToSlides}
                      className="inline-flex min-w-0 items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white flex-1 disabled:opacity-40"
                      style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
                    >
                      {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                      슬라이드 편집
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="hidden xl:block fixed inset-x-0 bottom-6 px-6 pointer-events-none z-40">
            <div className="max-w-7xl mx-auto rounded-[24px] px-6 py-4 pointer-events-auto" style={{ background: "rgba(246,247,244,0.92)", boxShadow: "0 20px 40px rgba(20,26,22,0.12)", backdropFilter: "blur(16px)" }}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push(backHref)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
                >
                  <ArrowLeft size={15} />
                  이전
                </button>
                <button
                  onClick={handleRunAI}
                  disabled={!canProceedToSlides}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
                >
                  {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  슬라이드 편집
                </button>
              </div>
            </div>
          </div>
        </>
      ) : step2Redesign ? (
        <>
          <div className="fixed inset-x-0 bottom-4 px-4 pointer-events-none z-40 xl:hidden">
            <div className="max-w-7xl mx-auto px-3.5 py-3 flex items-center justify-between gap-2.5 rounded-[24px] pointer-events-auto" style={{ background: "rgba(246,247,244,0.92)", border: "1px solid rgba(211,216,208,0.95)", boxShadow: "0 20px 40px rgba(20,26,22,0.12)", backdropFilter: "blur(16px)" }}>
              <button
                onClick={() => router.push(backHref)}
                className="inline-flex min-w-0 items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-[12px] sm:text-sm font-semibold flex-1"
                style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
              >
                <ArrowLeft size={15} />
                이전
              </button>
              <button
                onClick={() => router.push(nextHref)}
                disabled={totalSlides === 0}
                className="inline-flex min-w-0 items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-[12px] sm:text-sm font-semibold text-white flex-1 disabled:opacity-40"
                style={{ background: "#223B2A", boxShadow: totalSlides > 0 ? "0 12px 30px rgba(34,59,42,0.16)" : "none" }}
              >
                다음 단계
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div className="hidden xl:block fixed inset-x-0 bottom-6 px-6 pointer-events-none z-40">
            <div className="max-w-7xl mx-auto rounded-[24px] px-6 py-4 pointer-events-auto" style={{ background: "rgba(246,247,244,0.92)", boxShadow: "0 20px 40px rgba(20,26,22,0.12)", backdropFilter: "blur(16px)" }}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push(backHref)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
                >
                  <ArrowLeft size={15} />
                  이전
                </button>
                <button
                  onClick={() => router.push(nextHref)}
                  disabled={totalSlides === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: "#223B2A", boxShadow: totalSlides > 0 ? "0 12px 30px rgba(34,59,42,0.16)" : "none" }}
                >
                  다음 단계
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          className="px-4 sm:px-6 py-4 flex flex-row items-center justify-between gap-3 sm:gap-4"
          style={{ borderTop: "1px solid #D8EBD0", background: "white" }}
        >
          <button
            onClick={() => router.push(backHref)}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 sm:flex-none min-w-0"
            style={{ background: "#F2F7F0", border: "1px solid #D8EBD0", color: "#2E5E3E" }}
          >
            <ArrowLeft size={15} />
            이전
          </button>

          {mode === "lyrics" && availableModes.includes("lyrics") ? (
            <button
              onClick={handleRunAI}
              disabled={aiLoading}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex-1 sm:flex-none min-w-0"
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
              onClick={() => router.push(nextHref)}
              disabled={totalSlides === 0}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex-1 sm:flex-none min-w-0"
              style={{ background: "#2E5E3E", boxShadow: totalSlides > 0 ? "0 4px 16px rgba(46,94,62,0.2)" : "none" }}
            >
              다음 단계
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EditorFlow(props: Partial<EditorPageProps> = {}) {
  const pageProps: EditorPageProps = {
    headerStep: 1,
    initialMode: "lyrics",
    availableModes: ["lyrics"],
    backHref: "/",
    nextHref: "/editor/step2",
    showModeTabs: false,
    ...props,
  } as EditorPageProps;

  return <EditorFlowInner {...pageProps} />;
}
