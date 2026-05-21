"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

interface SlideCardProps {
  id: string;
  order: number;
  lyrics: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export function SlideCard({ id, order, lyrics, isActive, onClick, onRemove }: SlideCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
        isActive
          ? "border-gold bg-gold/10"
          : "border-border bg-card hover:border-[#444]"
      }`}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted mb-0.5">슬라이드 {order}</p>
        <p className="text-xs text-text-primary line-clamp-2 whitespace-pre-line">
          {lyrics || <span className="text-text-muted italic">빈 슬라이드</span>}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="mt-0.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
