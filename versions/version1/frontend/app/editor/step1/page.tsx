"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { SongCard } from "@/components/editor/SongCard";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { Search, Plus, ArrowRight, Music } from "lucide-react";

export default function Step1() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { songs, addSong, removeSong, reorderSongs, setSongLyrics, setSongLoading, setSongError } =
    usePPTStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddSong = async () => {
    const title = query.trim();
    const artistTrimmed = artist.trim();
    if (!title || songs.length >= 10) return;
    if (songs.some((s) => s.title === title)) {
      setQuery("");
      setArtist("");
      return;
    }

    addSong(title, artistTrimmed);
    setQuery("");
    setArtist("");
    setTimeout(() => inputRef.current?.focus(), 0);

    const song = usePPTStore.getState().songs.find((s) => s.title === title);
    if (!song) return;

    setSongLoading(song.id, true);
    try {
      const searchQuery = artistTrimmed ? `${title} ${artistTrimmed}` : title;
      const result = await api.searchLyrics(searchQuery, title);
      if (result.status === "found" && result.lyrics) {
        setSongLyrics(song.id, result.lyrics, (result.source as "manual" | "tavily") ?? "db");
      } else {
        setSongError(song.id, true);
      }
    } catch {
      setSongError(song.id, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddSong();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex);
    reorderSongs(reordered.map((s) => s.id));
  };

  const canProceed = songs.length > 0 && songs.every((s) => !s.loading) && songs.some((s) => s.lyrics || s.error);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F2F7F0" }}>
      <Header step={1} />

      <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-xl">

          {/* Page title */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5" style={{ color: "#1a3824" }}>
              곡 선택
            </h2>
            <p className="text-sm" style={{ color: "#5BAA72" }}>
              곡명을 검색해서 추가하세요. 아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
            </p>
          </div>

          {/* Search box */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "white", border: "1px solid #D8EBD0", boxShadow: "0 2px 16px rgba(46,94,62,0.06)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#86C59A" }}>곡 검색</p>
              <p className="text-xs" style={{ color: "#86C59A" }}>최대 10곡</p>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#86C59A" }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  placeholder="곡명 (예: 베드로의 고백)"
                  disabled={songs.length >= 10}
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm transition-colors"
                  style={{
                    background: "#F2F7F0",
                    border: "1px solid #D8EBD0",
                    color: "#1a3824",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2E5E3E")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#D8EBD0")}
                />
              </div>
              <button
                onClick={handleAddSong}
                disabled={!query.trim() || songs.length >= 10}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shrink-0 disabled:opacity-40"
                style={{ background: "#2E5E3E" }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">추가</span>
              </button>
            </div>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              placeholder="아티스트 (선택)"
              disabled={songs.length >= 10}
              className="w-full sm:w-52 rounded-xl px-3 py-2 text-sm transition-colors"
              style={{
                background: "#F2F7F0",
                border: "1px solid #D8EBD0",
                color: "#1a3824",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2E5E3E")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D8EBD0")}
            />
          </div>

          {/* Song list */}
          {songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ border: "1.5px dashed #9ABFAA" }}>
              <Music size={36} style={{ color: "#9ABFAA" }} className="mb-3" />
              <p className="text-sm font-medium" style={{ color: "#2E5E3E" }}>곡을 추가해주세요</p>
              <p className="text-xs mt-1" style={{ color: "#5BAA72" }}>위 검색창에서 곡명을 입력하세요</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#86C59A" }}>
                  추가된 곡
                </p>
                <p className="text-xs" style={{ color: "#86C59A" }}>
                  {songs.length} / 10
                </p>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {songs.map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        onRemove={() => removeSong(song.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <div
        className="px-6 sm:px-10 py-4 flex items-center justify-between gap-4"
        style={{ borderTop: "1px solid #D8EBD0", background: "white" }}
      >
        <p className="hidden md:block text-sm italic leading-relaxed" style={{ color: "#4a4a4a" }}>
          &ldquo;호흡이 있는 자마다 여호와를 찬양할지어다 할렐루야&rdquo;
          <span className="ml-2 text-xs not-italic" style={{ opacity: 0.6 }}>시편 150:6</span>
        </p>

        <button
          onClick={() => canProceed && router.push("/editor/step2")}
          disabled={!canProceed}
          className="ml-auto inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
          style={{
            background: "#2E5E3E",
            boxShadow: canProceed ? "0 4px 16px rgba(46,94,62,0.2)" : "none",
          }}
        >
          다음 단계
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
