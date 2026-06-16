"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";

interface SlideCardProps {
  id: string;
  order: number;
  lyrics: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}

export function SlideCard({
  id, order, lyrics, isActive, onClick, onRemove, onInsertBefore, onInsertAfter,
}: SlideCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div className="relative group/wrap">
      <button
        onClick={(e) => { e.stopPropagation(); onInsertBefore(); }}
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/wrap:opacity-100 transition-opacity flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md"
        style={{ background: "#2E5E3E", color: "white" }}
      >
        <Plus size={9} />
        앞에 추가
      </button>

      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: isActive ? "rgba(46,94,62,0.06)" : "white",
          border: `1px solid ${isActive ? "#2E5E3E" : "#D8EBD0"}`,
          borderRadius: "12px",
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        className="flex items-start gap-2 px-3 py-3 hover:shadow-sm"
        onClick={onClick}
      >
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ color: "#86C59A" }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#86C59A" }}>
            슬라이드 {order}
          </p>
          <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: "#1a3824" }}>
            {lyrics || <span style={{ color: "#86C59A", fontStyle: "italic" }}>빈 슬라이드</span>}
          </p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="mt-0.5 opacity-0 group-hover/wrap:opacity-100 transition-all flex-shrink-0 p-1 rounded-lg hover:bg-red-50"
          style={{ color: "#86C59A" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#86C59A")}
        >
          <X size={13} />
        </button>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onInsertAfter(); }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/wrap:opacity-100 transition-opacity flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md"
        style={{ background: "#2E5E3E", color: "white" }}
      >
        <Plus size={9} />
        뒤에 추가
      </button>
    </div>
  );
}
