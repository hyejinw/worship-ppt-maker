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
import { Button } from "@/components/ui/Button";
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

  const handleNext = () => {
    if (!canProceed) return;
    router.push("/editor/step2");
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header step={1} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h2 className="text-xl font-bold text-text-primary mb-1">곡 선택</h2>
        <p className="text-text-muted text-sm mb-6">
          찬양 곡명을 검색해서 추가하세요. 최대 10곡까지 가능합니다.
        </p>

        {/* 검색창 */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                placeholder="곡명 (예: 베드로의 고백)"
                className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold"
                disabled={songs.length >= 10}
              />
            </div>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              placeholder="아티스트 (선택)"
              className="w-36 bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold"
              disabled={songs.length >= 10}
            />
            <Button
              onClick={handleAddSong}
              disabled={!query.trim() || songs.length >= 10}
              size="md"
            >
              <Plus size={16} />
              추가
            </Button>
          </div>
        </div>

        {/* 곡 목록 */}
        {songs.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Music size={48} className="mx-auto mb-3 opacity-30" />
            <p>곡을 추가해주세요.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
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
        )}

        {songs.length > 0 && (
          <p className="text-xs text-text-muted mt-3">
            {songs.length}/10곡 추가됨
          </p>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="border-t border-border bg-bg-sub px-6 py-4 flex justify-end">
        <Button
          size="lg"
          onClick={handleNext}
          disabled={!canProceed}
          className="gap-2"
        >
          다음 단계
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
