"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { getProjects, ProjectRecord } from "@/lib/localStorage";
import { usePPTStore } from "@/store/pptStore";
import { Plus, Download, ChevronRight, Music, Sparkles, Sliders } from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const reset = usePPTStore((s) => s.reset);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-8">
          <Logo size={72} />
        </div>

        <h1 className="text-5xl font-bold text-text-primary mb-3 tracking-tight">
          찬양 PPT
        </h1>
        <p className="text-text-muted text-lg mb-2 max-w-md leading-relaxed">
          곡명만 입력하면 AI가 자동으로
        </p>
        <p className="text-accent text-lg font-medium mb-10">
          가사 수집 → 슬라이드 구분 → .pptx 생성
        </p>

        <Link href="/editor/step1" onClick={reset}>
          <Button size="lg" className="gap-2 text-base px-10 py-3.5">
            <Plus size={20} />
            새 PPT 만들기
          </Button>
        </Link>

        {/* 특징 */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full text-left">
          {[
            { icon: <Music size={18} className="text-accent" />, title: "자동 가사 수집", desc: "곡명만 입력하면 웹에서 가사를 자동으로 검색합니다." },
            { icon: <Sparkles size={18} className="text-accent" />, title: "AI 슬라이드 구분", desc: "AI가 가사를 의미 단위로 슬라이드에 배분합니다." },
            { icon: <Sliders size={18} className="text-accent" />, title: "자유로운 커스터마이징", desc: "폰트, 배경, 텍스트 위치를 조정하고 즉시 다운로드합니다." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-[#333] transition-colors">
              <div className="mb-3 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text-primary mb-1.5">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 프로젝트 */}
      {projects.length > 0 && (
        <div className="border-t border-border bg-bg-sub px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Music size={12} />
              최근 프로젝트
            </h2>
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-[#333] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {p.songs.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.downloadUrl && (
                      <a href={p.downloadUrl} download>
                        <Button variant="ghost" size="sm">
                          <Download size={14} />
                        </Button>
                      </a>
                    )}
                    <Link href="/editor/step1" onClick={reset}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
