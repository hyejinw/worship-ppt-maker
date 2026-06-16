"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Song } from "@/store/pptStore";
import { GripVertical, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

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
    if (song.loading) return <Loader2 size={13} className="animate-spin" style={{ color: "#2E5E3E" }} />;
    if (song.error) return <AlertCircle size={13} style={{ color: "#dc2626" }} />;
    if (song.lyrics) return <CheckCircle size={13} style={{ color: "#2E5E3E" }} />;
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
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "white",
        border: "1px solid #D8EBD0",
        borderRadius: "14px",
        transition: "box-shadow 0.15s",
      }}
      className="hover:shadow-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ color: "#86C59A" }}
        >
          <GripVertical size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: "#1a3824", fontSize: "0.9rem" }}>
            {song.title}
            {song.artist && (
              <span style={{ color: "#5BAA72", fontWeight: 400, fontSize: "0.8rem" }} className="ml-1.5">
                · {song.artist}
              </span>
            )}
          </p>
          {statusText() && (
            <p
              className="text-xs mt-0.5 flex items-center gap-1"
              style={{ color: song.error ? "#dc2626" : "#5BAA72" }}
            >
              {statusIcon()}
              {statusText()}
            </p>
          )}
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-red-50"
          style={{ color: "#86C59A" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#86C59A")}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
