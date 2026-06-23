"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getProjects, ProjectRecord } from "@/lib/localStorage";
import { usePPTStore } from "@/store/pptStore";
import { Plus, Download, Music, Sparkles, FileDown, ChevronRight } from "lucide-react";

const TEXT = "#151A16";
const MUTED = "#6B746C";
const SOFT = "#EEF2EC";
const BORDER = "#D6DAD3";
const ACCENT = "#223B2A";

function SlidePreviewCard() {
  return (
    <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-[30px] overflow-hidden flex flex-col" style={{ background: "#FBFCF9", border: `1px solid ${BORDER}`, boxShadow: "0 20px 46px rgba(20,26,22,0.10)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-7 pb-3 text-center" style={{ background: "linear-gradient(180deg, rgba(242,247,241,0.92) 0%, rgba(251,252,249,0.98) 100%)" }}>
        <p className="text-sm font-semibold leading-relaxed mb-1" style={{ color: "#2E5E3E" }}>
          할렐루야 우리 하나님을 찬양하는 일이 선함이여
        </p>
        <p className="text-sm font-semibold leading-relaxed" style={{ color: "#4A7A56" }}>
          찬송하는 일이 아름답고 마땅하도다
        </p>
        <p className="text-xs font-medium mt-3" style={{ color: "#5BAA72" }}>시편 147:1</p>
      </div>
      <div className="h-[38%] overflow-hidden">
        <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <rect width="300" height="100" fill="#EAF2E7"/>
          <ellipse cx="250" cy="110" rx="130" ry="55" fill="#C5D3C1" opacity="0.5"/>
          <ellipse cx="60"  cy="115" rx="100" ry="50" fill="#AFC0AB" opacity="0.4"/>
          <ellipse cx="150" cy="105" rx="160" ry="65" fill="#93A58F" opacity="0.42"/>
          <ellipse cx="20"  cy="120" rx="90"  ry="45" fill="#7E8F7B" opacity="0.42"/>
          <ellipse cx="80"  cy="120" rx="120" ry="55" fill="#678065" opacity="0.55"/>
          <ellipse cx="240" cy="125" rx="110" ry="50" fill="#4F6A50"/>
          <ellipse cx="150" cy="130" rx="90"  ry="45" fill="#2E5E3E"/>
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const reset = usePPTStore((s) => s.reset);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "linear-gradient(145deg, #ECEEE9 0%, #DCE4DA 52%, #C9D4C8 100%)" }}>

      {/* Navbar */}
      <nav className="w-full px-4 sm:px-10 py-3 sm:py-4 flex items-center justify-between gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <Image src="/hymnly-logo.png" alt="Hymnly" width={37} height={37} className="object-contain" />
          <div className="min-w-0">
            <span className="font-bold text-base tracking-tight" style={{ color: TEXT }}>Hymnly</span>
            <p className="hidden sm:block text-[10px] font-medium tracking-widest uppercase -mt-0.5" style={{ color: MUTED }}>Worship Slides</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium" style={{ color: MUTED }}>
            <a href="#features" className="hover:opacity-80 transition-colors">기능 소개</a>
            <a href="#how" className="hover:opacity-80 transition-colors">사용 방법</a>
          </div>
          <Link href="/editor/step1" onClick={reset}>
            <button
              className="text-xs sm:text-sm font-semibold text-white px-4 sm:px-5 py-2 rounded-full transition-all whitespace-nowrap"
              style={{ background: ACCENT, boxShadow: "0 12px 28px rgba(34,59,42,0.18)" }}
            >
              새 예배 만들기
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-12 py-10 sm:py-14" style={{ background: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.92) 0%, rgba(249,252,247,0.82) 40%, rgba(236,242,236,0.65) 100%)" }}>
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 sm:gap-12">

          {/* Left: text */}
          <div className="flex flex-col items-start w-full lg:w-[52%]">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.22] sm:leading-[1.4] tracking-tight mb-4 sm:mb-6" style={{ color: TEXT }}>
              예배 슬라이드,
              <br />
              <span className="relative inline-block">
                몇 초 만에
                <span className="absolute -top-2 -right-6 text-3xl select-none leading-none" style={{ color: MUTED }}>✦</span>
              </span>
            </h1>

            <p className="text-base sm:text-xl leading-relaxed mb-7 sm:mb-10" style={{ color: MUTED }}>
              곡명만 입력하면 AI가 가사를 정리하고
              <br />
              예배용 PPT를 자동으로 만들어드립니다.
            </p>

            <Link href="/editor/step1" onClick={reset}>
              <button
                className="inline-flex items-center gap-2.5 text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-[20px] transition-all"
                style={{ background: ACCENT, boxShadow: "0 16px 34px rgba(34,59,42,0.18)" }}
              >
                <Plus size={18} strokeWidth={2.5} />
                새 PPT 만들기
              </button>
            </Link>
          </div>

          {/* Right: slide preview */}
          <div className="flex items-center justify-center w-full lg:w-[48%]">
            <SlidePreviewCard />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 sm:px-10 py-10 sm:py-12" style={{ background: "#F8F8F5", borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Music size={20} className="text-[#2E5E3E]" />,
                title: "자동 가사 수집",
                desc: "웹에서 자동 검색",
              },
              {
                icon: <Sparkles size={20} className="text-[#2E5E3E]" />,
                title: "AI 슬라이드 분할",
                desc: "의미 단위로 자동 구성",
              },
              {
                icon: <FileDown size={20} className="text-[#2E5E3E]" />,
                title: "PPTX 다운로드",
                desc: "바로 예배 사용 가능",
              },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4 p-5 rounded-2xl transition-all hover:shadow-sm"
                style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(20,26,22,0.04)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: SOFT }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: TEXT }}>{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent projects */}
      {projects.length > 0 && (
        <section className="px-4 sm:px-10 py-8" style={{ background: "#ECEEE9", borderTop: `1px solid ${BORDER}` }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: MUTED }}>
              <Music size={12} />
              최근 프로젝트
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all hover:shadow-sm"
                  style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(20,26,22,0.04)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{p.title}</p>
                    <p className="text-xs mt-0.5 truncate max-w-[140px] sm:max-w-[180px]" style={{ color: MUTED }}>
                      {p.songs.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.downloadUrl && (
                      <a href={p.downloadUrl} download>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ color: MUTED }}>
                          <Download size={14} />
                        </button>
                      </a>
                    )}
                    <Link href="/editor/step1" onClick={reset}>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ color: MUTED }}>
                        <ChevronRight size={14} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-4 sm:px-10 py-6 text-center" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-xs" style={{ color: MUTED }}>© 2025 Hymnly · 예배를 더 아름답게</p>
      </footer>
    </div>
  );
}
