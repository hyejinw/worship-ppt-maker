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
  variant?: "default" | "redesign";
}

export function SlideCard({
  id, order, lyrics, isActive, onClick, onRemove, onInsertBefore, onInsertAfter, variant = "default",
}: SlideCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const redesign = variant === "redesign";
  const accent = redesign ? "#223B2A" : "#2E5E3E";
  const muted = redesign ? "#6B746C" : "#86C59A";

  return (
    <div className="relative group/wrap">
      <button
        onClick={(e) => { e.stopPropagation(); onInsertBefore(); }}
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/wrap:opacity-100 transition-opacity flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md"
        style={{ background: accent, color: "white" }}
      >
        <Plus size={9} />
        앞에 추가
      </button>

      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: redesign ? (isActive ? "#FFFFFF" : "rgba(255,255,255,0.72)") : isActive ? "rgba(46,94,62,0.06)" : "white",
          border: `1px solid ${redesign ? (isActive ? "#BFCABF" : "#D6DAD3") : isActive ? "#2E5E3E" : "#D8EBD0"}`,
          borderRadius: redesign ? "18px" : "12px",
          cursor: "pointer",
          boxShadow: redesign && isActive ? "0 10px 24px rgba(20,26,22,0.08)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
        }}
        className={redesign ? "flex items-start gap-2.5 px-3.5 py-3.5 hover:shadow-sm" : "flex items-start gap-2 px-3 py-3 hover:shadow-sm"}
        onClick={onClick}
      >
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ color: muted, touchAction: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: muted }}>
            슬라이드 {order}
          </p>
          <p className={redesign ? "text-[13px] whitespace-pre-line leading-relaxed" : "text-xs whitespace-pre-line leading-relaxed"} style={{ color: redesign ? "#151A16" : "#1a3824" }}>
            {lyrics || <span style={{ color: muted, fontStyle: "italic" }}>빈 슬라이드</span>}
          </p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="mt-0.5 opacity-0 group-hover/wrap:opacity-100 transition-all flex-shrink-0 p-1 rounded-lg hover:bg-red-50"
          style={{ color: muted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
        >
          <X size={13} />
        </button>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onInsertAfter(); }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/wrap:opacity-100 transition-opacity flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md"
        style={{ background: accent, color: "white" }}
      >
        <Plus size={9} />
        뒤에 추가
      </button>
    </div>
  );
}
