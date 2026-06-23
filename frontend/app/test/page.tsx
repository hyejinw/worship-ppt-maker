import { Header } from "@/components/ui/Header";
import {
  ArrowLeft,
  CheckCircle2,
  GripVertical,
  Music4,
  PencilLine,
  Plus,
  Search,
  Wand2,
} from "lucide-react";

const songs = [
  { title: "베드로의 고백", artist: "브리지임팩트", status: "현재 편집 중", active: true },
  { title: "다시 한 번", artist: "브리지임팩트", status: "6슬라이드", active: false },
  { title: "왕이 오시네", artist: "레베카 황", status: "4슬라이드", active: false },
];

const lyrics = `주님 앞에 나아갑니다
내 삶을 드립니다

나의 약함도 아시는 주님
은혜로 붙드소서

주님의 뜻을 구합니다
내 마음 새롭게 하소서

주님만 바라봅니다
내 길을 인도하소서`;

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#7D867F" }}>
      {children}
    </p>
  );
}

export default function TestPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ECEEE9" }}>
      <Header step={1} />

      <div
        className="px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "#F6F7F4", borderBottom: "1px solid #D3D8D0" }}
      >
        <div>
          <p className="text-lg font-semibold tracking-tight" style={{ color: "#151A16" }}>Step1</p>
        </div>
        <a
          href="/editor/step1"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#FFFFFF", color: "#1C241E", border: "1px solid #D3D8D0" }}
        >
          기존 step1 보기
        </a>
      </div>

      <main className="flex-1 min-h-0 flex flex-col xl:grid xl:grid-cols-[280px_minmax(0,1fr)] pb-28">
        <aside
          className="hidden xl:flex flex-col"
          style={{ background: "#DDE4DA", color: "#182019", borderRight: "1px solid #CCD4CA" }}
        >
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #C9D1C8" }}>
            <Kicker>Selected Songs</Kicker>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight">3곡</p>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" }}
              >
                <Plus size={12} />
                곡 추가
              </button>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-2 overflow-y-auto">
            {songs.map((song) => (
              <button
                key={song.title}
                className="text-left rounded-2xl p-3 transition-all"
                style={{
                  background: song.active ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                  color: "#131914",
                  border: `1px solid ${song.active ? "#BFCABF" : "#CDD5CC"}`,
                  boxShadow: song.active ? "0 10px 24px rgba(20,26,22,0.08)" : "none",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 w-8 h-8 rounded-xl grid place-items-center"
                    style={{
                      background: song.active ? "#EEF2EC" : "#E7ECE6",
                      color: "#5C665E",
                    }}
                  >
                    <GripVertical size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{song.title}</p>
                      {song.active && (
                        <span
                          className="px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
                          style={{ background: "#E7EFE8", color: "#244631" }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs truncate mt-1"
                      style={{ color: "#5B645D" }}
                    >
                      {song.artist}
                    </p>
                    <p
                      className="text-xs mt-2"
                      style={{ color: "#4A6B56" }}
                    >
                      {song.status}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex flex-col">
          <div
            className="px-4 sm:px-6 py-4 xl:hidden"
            style={{ background: "#DDE4DA", color: "#182019", borderBottom: "1px solid #CCD4CA" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <Kicker>Selected Songs</Kicker>
                <p className="text-sm font-semibold mt-1">3곡 선택됨</p>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" }}
              >
                <Plus size={12} />
                곡 추가
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {songs.map((song) => (
                <button
                  key={song.title}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold shrink-0"
                  style={{
                    background: song.active ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                    color: "#151A16",
                    border: `1px solid ${song.active ? "#BCC7BC" : "#CCD4CA"}`,
                  }}
                >
                  <Music4 size={12} />
                  {song.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 2xl:grid-cols-[minmax(0,1.2fr)_360px] gap-5">
              <div className="min-w-0 flex flex-col gap-5">
                <div
                  className="rounded-[28px] overflow-hidden"
                  style={{
                    background: "#F8F8F5",
                    border: "1px solid #D6DAD3",
                    boxShadow: "0 18px 48px rgba(20,26,22,0.08)",
                  }}
                >
                  <div className="px-5 sm:px-6 py-5" style={{ borderBottom: "1px solid #DFE3DD" }}>
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <Kicker>곡 검색</Kicker>
                        <p className="text-sm mt-1" style={{ color: "#616A62" }}>
                          아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
                        </p>
                      </div>
                      <p className="text-xs font-medium shrink-0" style={{ color: "#7B857C" }}>
                        최대 10곡
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3">
                      <label
                        className="flex items-center gap-3 rounded-[20px] px-4 py-3.5"
                        style={{ background: "#FFFFFF", border: "1px solid #CDD3CC" }}
                      >
                        <Search size={16} style={{ color: "#6B746C" }} />
                        <input
                          readOnly
                          value="베드로의 고백"
                          className="w-full bg-transparent text-sm"
                          style={{ color: "#151A16" }}
                          placeholder="곡명 (예: 베드로의 고백)"
                        />
                      </label>

                      <label
                        className="flex items-center rounded-[20px] px-4 py-3.5"
                        style={{ background: "#FFFFFF", border: "1px solid #CDD3CC" }}
                      >
                        <input
                          readOnly
                          value="브리지임팩트"
                          className="w-full bg-transparent text-sm"
                          style={{ color: "#151A16" }}
                          placeholder="아티스트 (선택)"
                        />
                      </label>

                      <button
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[20px] text-sm font-semibold"
                        style={{ background: "#223B2A", color: "#FFFFFF", boxShadow: "0 12px 30px rgba(34,59,42,0.18)" }}
                      >
                        <Plus size={16} />
                        곡 추가
                      </button>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0">
                        <Kicker>가사 편집</Kicker>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "#151A16" }}>
                            베드로의 고백
                          </h2>
                          <button
                            className="w-9 h-9 rounded-xl grid place-items-center"
                            style={{ background: "#EBEEEA", color: "#223B2A" }}
                          >
                            <PencilLine size={15} />
                          </button>
                        </div>
                        <p className="text-sm mt-2 leading-relaxed max-w-xl" style={{ color: "#616A62" }}>
                          웹에서 불러온 가사예요. 한번 확인해 주세요.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {["원본 복원", "중복 제거", "줄 번호 정리", "빈 줄 정리", "영어 삭제", "괄호 삭제"].map((label) => (
                          <button
                            key={label}
                            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                            style={{ background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#253029" }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className="mt-5 rounded-[24px] overflow-hidden"
                      style={{ background: "#FFFFFF", border: "1px solid #D6DAD3" }}
                    >
                      <div
                        className="px-4 sm:px-5 py-3 flex items-center justify-between"
                        style={{ background: "#F2F3EF", borderBottom: "1px solid #E0E4DE" }}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#314038" }}>
                          <CheckCircle2 size={15} />
                          검색된 가사
                        </div>
                      </div>

                      <div className="grid grid-cols-[58px_minmax(0,1fr)]">
                        <div
                          className="px-3 py-5 text-right font-mono text-[11px]"
                          style={{ background: "#F7F7F3", color: "#8A928B", borderRight: "1px solid #E3E6E0" }}
                        >
                          {lyrics.split("\n").map((_, i) => (
                            <div key={i} className="leading-8">
                              {String(i + 1).padStart(2, "0")}
                            </div>
                          ))}
                        </div>

                        <div
                          className="px-5 sm:px-6 py-5 whitespace-pre-wrap text-[16px] leading-8"
                          style={{ color: "#161C17", letterSpacing: "-0.01em" }}
                        >
                          {lyrics}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col gap-5">
                <div
                  className="rounded-[28px] overflow-hidden"
                  style={{
                    background: "#F8F8F5",
                    border: "1px solid #D6DAD3",
                    boxShadow: "0 18px 42px rgba(20,26,22,0.06)",
                  }}
                >
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid #E0E4DE" }}>
                    <Kicker>가사 관리</Kicker>
                    <h3 className="text-xl font-semibold tracking-[-0.02em] mt-2" style={{ color: "#151A16" }}>
                      빠른 정리 도구
                    </h3>
                  </div>

                  <div className="px-5 py-5 grid grid-cols-1 gap-3 text-sm leading-relaxed">
                    {[
                      "원본 복원",
                      "중복 제거",
                      "줄 번호 정리",
                      "빈 줄 정리",
                    ].map((item) => (
                      <button
                        key={item}
                        className="rounded-2xl px-4 py-3 text-left font-semibold"
                        style={{ background: "#FFFFFF", color: "#253029", border: "1px solid #D6DAD3" }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-[28px] p-5"
                  style={{
                    background: "#F8F8F5",
                    border: "1px solid #D6DAD3",
                    boxShadow: "0 18px 42px rgba(20,26,22,0.06)",
                  }}
                >
                  <Kicker>Next Step</Kicker>
                  <h3 className="text-xl font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>다음 단계</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: "#616A62" }}>
                    곡 목록에서 곡을 고르고, 중앙에서 가사를 수정한 뒤 다음으로 넘어갑니다.
                  </p>
                  <button
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] text-sm font-semibold"
                    style={{ background: "#223B2A", color: "#FFFFFF" }}
                  >
                    <Wand2 size={16} />
                    슬라이드 편집
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 px-4 sm:px-6 pb-4 pointer-events-none">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-5 py-4 flex items-center justify-between gap-3 rounded-[24px] pointer-events-auto"
          style={{
            background: "rgba(246,247,244,0.92)",
            border: "1px solid rgba(211,216,208,0.95)",
            boxShadow: "0 20px 40px rgba(20,26,22,0.12)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold flex-1 sm:flex-none"
            style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
          >
            <ArrowLeft size={15} />
            이전
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white flex-1 sm:flex-none"
            style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
          >
            <Wand2 size={15} />
            슬라이드 편집
          </button>
        </div>
      </div>
    </div>
  );
}
