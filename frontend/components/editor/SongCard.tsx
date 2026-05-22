"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Song } from "@/store/pptStore";
import { GripVertical, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface SongCardProps {
  song: Song;
  onRemove: () => void;
}

export function SongCard({ song, onRemove }: SongCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: song.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusIcon = () => {
    if (song.loading) return <Loader2 size={13} className="animate-spin text-accent" />;
    if (song.error) return <AlertCircle size={13} className="text-error" />;
    if (song.lyrics) return <CheckCircle size={13} className="text-success" />;
    return null;
  };

  const statusText = () => {
    if (song.loading) return "가사 수집 중...";
    if (song.error) return "가사를 찾지 못했습니다. 2단계에서 직접 입력하세요.";
    if (song.lyrics && song.source) {
      const sourceLabel = { manual: "직접 입력", tavily: "웹 검색", db: "저장된 가사" }[song.source];
      return `가사 로드됨 (${sourceLabel})`;
    }
    return null;
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="text-[#333] hover:text-text-muted cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {song.title}
            {song.artist && (
              <span className="text-text-muted font-normal ml-1.5 text-sm">· {song.artist}</span>
            )}
          </p>
          {statusText() && (
            <p className={clsx("text-xs mt-0.5 flex items-center gap-1",
              song.error ? "text-error" : "text-text-muted"
            )}>
              {statusIcon()}
              {statusText()}
            </p>
          )}
        </div>

        <button
          onClick={onRemove}
          className="text-[#333] hover:text-error p-1 rounded transition-colors flex-shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
