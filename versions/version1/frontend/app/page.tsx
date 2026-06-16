"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getProjects, ProjectRecord } from "@/lib/localStorage";
import { usePPTStore } from "@/store/pptStore";
import { Plus, Download, Music, Sparkles, FileDown, ChevronRight } from "lucide-react";

function SlidePreviewCard() {
  return (
    <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ background: "white", border: "1px solid #e8f0e4" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-3 text-center">
        <p className="text-[#1a3824] text-sm font-semibold leading-relaxed mb-1">
          할렐루야 우리 하나님을 찬양하는 일이 선함이여
        </p>
        <p className="text-[#1a3824] text-sm font-semibold leading-relaxed">
          찬송하는 일이 아름답고 마땅하도다
        </p>
        <p className="text-[#5BAA72] text-xs font-medium mt-3">시편 147:1</p>
      </div>
      <div className="h-[38%] overflow-hidden">
        <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <rect width="300" height="100" fill="#e8f5ee"/>
          <ellipse cx="250" cy="110" rx="130" ry="55" fill="#86C59A" opacity="0.5"/>
          <ellipse cx="60"  cy="115" rx="100" ry="50" fill="#86C59A" opacity="0.4"/>
          <ellipse cx="150" cy="105" rx="160" ry="65" fill="#5BAA72" opacity="0.55"/>
          <ellipse cx="20"  cy="120" rx="90"  ry="45" fill="#4a9660" opacity="0.5"/>
          <ellipse cx="80"  cy="120" rx="120" ry="55" fill="#3D6F4A"/>
          <ellipse cx="240" cy="125" rx="110" ry="50" fill="#2E5E3E"/>
          <ellipse cx="150" cy="130" rx="90"  ry="45" fill="#1a3824"/>
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
    <div className="min-h-screen flex flex-col" style={{ background: "#F2F7F0" }}>

      {/* Navbar */}
      <nav className="w-full px-6 sm:px-10 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #D8EBD0" }}>
        <div className="flex items-center gap-2.5">
          <Image src="/hymnly-logo.png" alt="Hymnly" width={37} height={37} className="object-contain" />
          <div>
            <span className="font-bold text-[#2E5E3E] text-base tracking-tight">Hymnly</span>
            <p className="text-[10px] text-[#5BAA72] font-medium tracking-widest uppercase -mt-0.5">Worship Slides</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-6 text-sm text-[#4a7a56] font-medium">
            <a href="#features" className="hover:text-[#2E5E3E] transition-colors">기능 소개</a>
            <a href="#how" className="hover:text-[#2E5E3E] transition-colors">사용 방법</a>
          </div>
          <Link href="/editor/step1" onClick={reset}>
            <button
              className="text-sm font-semibold text-white px-5 py-2 rounded-full transition-all hover:opacity-90 shadow-sm"
              style={{ background: "#2E5E3E" }}
            >
              새 예배 만들기
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 sm:px-12 py-14">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12">

          {/* Left: text */}
          <div className="flex flex-col items-start w-full lg:w-[52%]">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#1a3824] leading-[1.4] tracking-tight mb-6">
              예배 슬라이드,
              <br />
              <span className="relative inline-block">
                몇 초 만에
                <span className="absolute -top-2 -right-6 text-[#FFD166] text-3xl select-none leading-none">✦</span>
              </span>
            </h1>

            <p className="text-[#4a7a56] text-lg sm:text-xl leading-relaxed mb-10">
              곡명만 입력하면 AI가 가사를 정리하고
              <br />
              예배용 PPT를 자동으로 만들어드립니다.
            </p>

            <Link href="/editor/step1" onClick={reset}>
              <button
                className="inline-flex items-center gap-2.5 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all hover:opacity-90 shadow-lg"
                style={{ background: "#2E5E3E", boxShadow: "0 4px 20px rgba(46,94,62,0.25)" }}
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
      <section id="features" className="px-6 sm:px-10 py-12" style={{ background: "white", borderTop: "1px solid #D8EBD0" }}>
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
                style={{ background: "#F2F7F0", border: "1px solid #D8EBD0" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#D8EBD0" }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-[#1a3824] text-sm">{f.title}</p>
                  <p className="text-[#4a7a56] text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent projects */}
      {projects.length > 0 && (
        <section className="px-6 sm:px-10 py-8" style={{ background: "#F2F7F0", borderTop: "1px solid #D8EBD0" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#5BAA72] mb-4 flex items-center gap-2">
              <Music size={12} />
              최근 프로젝트
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-4 rounded-2xl transition-all hover:shadow-sm"
                  style={{ background: "white", border: "1px solid #D8EBD0" }}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1a3824]">{p.title}</p>
                    <p className="text-xs text-[#4a7a56] mt-0.5 truncate max-w-[180px]">
                      {p.songs.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.downloadUrl && (
                      <a href={p.downloadUrl} download>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#4a7a56] hover:bg-[#F2F7F0] transition-colors">
                          <Download size={14} />
                        </button>
                      </a>
                    )}
                    <Link href="/editor/step1" onClick={reset}>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#4a7a56] hover:bg-[#F2F7F0] transition-colors">
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
      <footer className="px-6 sm:px-10 py-6 text-center" style={{ borderTop: "1px solid #D8EBD0" }}>
        <p className="text-xs text-[#5BAA72]">© 2025 Hymnly · 예배를 더 아름답게</p>
      </footer>
    </div>
  );
}
