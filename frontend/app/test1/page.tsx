"use client";

import { useState } from "react";
import { Header } from "@/components/ui/Header";
import {
  ArrowLeft,
  GripVertical,
  Music4,
  PencilLine,
  Plus,
  Search,
  Wand2,
  X,
} from "lucide-react";

type SongItem = {
  id: string;
  title: string;
  artist: string;
  status: string;
  source?: "manual" | "tavily" | "db";
  lyrics: string;
};

const songs: SongItem[] = [
  {
    id: "peter",
    title: "베드로의 고백",
    artist: "브리지임팩트",
    status: "현재 편집 중",
    source: "tavily",
    lyrics: `주님 앞에 나아갑니다
내 삶을 드립니다

나의 약함도 아시는 주님
은혜로 붙드소서

주님의 뜻을 구합니다
내 마음 새롭게 하소서`,
  },
  {
    id: "again",
    title: "다시 한 번",
    artist: "브리지임팩트",
    status: "가사 로드됨",
    source: "db",
    lyrics: `다시 한 번 주 앞에 나아갑니다
다시 한 번 은혜를 구합니다`,
  },
  {
    id: "king",
    title: "왕이 오시네",
    artist: "레베카 황",
    status: "가사 로드됨",
    source: "manual",
    lyrics: `왕이 오시네
만왕의 왕께서 오시네`,
  },
];

const tools = ["원본 복원", "중복 제거", "줄 번호 정리", "빈 줄 정리", "영어 삭제", "괄호 삭제"];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#7D867F" }}>
      {children}
    </p>
  );
}

export default function Test1Page() {
  const [activeSongId, setActiveSongId] = useState<string>("peter");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const activeSong = songs.find((song) => song.id === activeSongId) ?? songs[0];

  const selectSong = (songId: string) => {
    setActiveSongId(songId);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ECEEE9" }}>
      <Header step={1} />

      <main className="flex-1 min-h-0 flex flex-col xl:grid xl:grid-cols-[280px_minmax(0,1fr)_320px] pb-52 sm:pb-44 xl:pb-32">
        <aside
          className="hidden xl:flex flex-col"
          style={{ background: "#DDE4DA", color: "#182019", borderRight: "1px solid #CCD4CA" }}
        >
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #C9D1C8" }}>
            <Kicker>곡 목록</Kicker>
            <div className="mt-3 flex items-start justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight">{songs.length}곡</p>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold"
                style={{ background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" }}
              >
                <Plus size={12} />
                곡 추가
              </button>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-2 overflow-y-auto">
            {songs.map((song) => {
              const active = song.id === activeSongId;
              return (
                <button
                  key={song.id}
                  onClick={() => selectSong(song.id)}
                  className="text-left rounded-2xl p-3 transition-all"
                  style={{
                    background: active ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                    color: "#131914",
                    border: `1px solid ${active ? "#BFCABF" : "#CDD5CC"}`,
                    boxShadow: active ? "0 10px 24px rgba(20,26,22,0.08)" : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-8 h-8 rounded-xl grid place-items-center"
                      style={{ background: active ? "#EEF2EC" : "#E7ECE6", color: "#5C665E" }}
                    >
                      <GripVertical size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate text-[14px]">{song.title}</p>
                      </div>
                      <p className="text-[11px] truncate mt-1" style={{ color: "#5B645D" }}>
                        {song.artist}
                      </p>
                      <p className="text-[11px] mt-2" style={{ color: "#4A6B56" }}>
                        {song.status}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 flex flex-col">
          <div
            className="px-4 sm:px-6 py-4 xl:hidden"
            style={{ background: "#DDE4DA", color: "#182019", borderBottom: "1px solid #CCD4CA" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <Kicker>곡 목록</Kicker>
                <p className="text-[13px] sm:text-sm font-semibold mt-1">{songs.length}곡 선택됨</p>
              </div>
              <button
                onClick={() => setShowSearchPanel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold"
                style={{ background: "#F7F8F5", color: "#1A2C20", border: "1px solid #C7D0C6" }}
              >
                <Plus size={12} />
                곡 추가
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {songs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => selectSong(song.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-semibold shrink-0"
                  style={{
                    background: song.id === activeSongId ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                    color: "#151A16",
                    border: `1px solid ${song.id === activeSongId ? "#BCC7BC" : "#CCD4CA"}`,
                  }}
                >
                  <Music4 size={12} />
                  {song.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="max-w-7xl mx-auto flex flex-col gap-5">
              {showSearchPanel && (
                <div
                  className="xl:hidden rounded-[28px] overflow-hidden"
                  style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 48px rgba(20,26,22,0.08)" }}
                >
                  <div className="px-5 sm:px-6 py-5">
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <Kicker>곡 검색</Kicker>
                        <p className="text-[13px] sm:text-sm mt-1" style={{ color: "#616A62" }}>
                          아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-[11px] sm:text-xs font-medium" style={{ color: "#7B857C" }}>
                          최대 10곡
                        </p>
                        <button
                          onClick={() => setShowSearchPanel(false)}
                          className="w-8 h-8 rounded-xl grid place-items-center"
                          style={{ background: "#EBEEEA", color: "#4F5C52" }}
                        >
                          <X size={14} />
                        </button>
                      </div>
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
                          className="w-full bg-transparent text-[13px] sm:text-sm"
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
                          className="w-full bg-transparent text-[13px] sm:text-sm"
                          style={{ color: "#151A16" }}
                          placeholder="아티스트 (선택)"
                        />
                      </label>

                      <button
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[20px] text-[13px] sm:text-sm font-semibold"
                        style={{ background: "#223B2A", color: "#FFFFFF", boxShadow: "0 12px 30px rgba(34,59,42,0.18)" }}
                      >
                        <Plus size={16} />
                        곡 추가
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="rounded-[28px] overflow-hidden"
                style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 48px rgba(20,26,22,0.08)" }}
              >
                <div className="hidden xl:block px-5 sm:px-6 py-5 border-b" style={{ borderColor: "#DFE3DD" }}>
                  <div className="flex items-end justify-between gap-3 mb-4">
                    <div>
                      <Kicker>곡 검색</Kicker>
                      <p className="text-[13px] sm:text-sm mt-1" style={{ color: "#616A62" }}>
                        아티스트를 함께 입력하면 더 정확하게 찾을 수 있어요.
                      </p>
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium shrink-0" style={{ color: "#7B857C" }}>
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
                        className="w-full bg-transparent text-[13px] sm:text-sm"
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
                        className="w-full bg-transparent text-[13px] sm:text-sm"
                        style={{ color: "#151A16" }}
                        placeholder="아티스트 (선택)"
                      />
                    </label>

                    <button
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[20px] text-[13px] sm:text-sm font-semibold"
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
                        <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "#151A16" }}>
                          {activeSong.title}
                        </h2>
                        <button
                          className="w-9 h-9 rounded-xl grid place-items-center"
                          style={{ background: "#EBEEEA", color: "#223B2A" }}
                        >
                          <PencilLine size={15} />
                        </button>
                      </div>
                      {activeSong.source && activeSong.source !== "manual" && (
                        <p className="text-[13px] sm:text-sm mt-2 leading-relaxed max-w-xl" style={{ color: "#616A62" }}>
                          웹에서 불러온 가사예요. 한번 확인해 주세요.
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="mt-5 rounded-[24px] overflow-hidden"
                    style={{ background: "#FFFFFF", border: "1px solid #D6DAD3" }}
                  >
                    <div className="grid grid-cols-[42px_minmax(0,1fr)] sm:grid-cols-[50px_minmax(0,1fr)]">
                      <div
                        className="px-1.5 sm:px-2.5 py-5 text-right font-mono text-[11px]"
                        style={{ background: "#F7F7F3", color: "#8A928B", borderRight: "1px solid #E3E6E0" }}
                      >
                        {activeSong.lyrics.split("\n").map((_, i) => (
                          <div key={i} className="leading-7 sm:leading-8">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                        ))}
                      </div>

                      <div
                        className="px-5 sm:px-6 py-5 whitespace-pre-wrap text-[15px] sm:text-[16px] leading-7 sm:leading-8"
                        style={{ color: "#161C17", letterSpacing: "-0.01em" }}
                      >
                        {activeSong.lyrics}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden xl:flex flex-col gap-5 px-5 py-5">
          <div
            className="rounded-[28px] p-5"
            style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 42px rgba(20,26,22,0.06)" }}
          >
            <Kicker>가사 관리</Kicker>
            <h3 className="text-[20px] font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>
              빠른 정리 도구
            </h3>
            <div className="mt-5 flex flex-col gap-3">
              {tools.map((item) => (
                <button
                  key={item}
                  className="rounded-2xl px-4 py-3 text-left text-[13px] font-semibold"
                  style={{ background: "#FFFFFF", color: "#253029", border: "1px solid #D6DAD3" }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-[28px] p-5"
            style={{ background: "#F8F8F5", border: "1px solid #D6DAD3", boxShadow: "0 18px 42px rgba(20,26,22,0.06)" }}
          >
            <Kicker>다음 단계</Kicker>
            <h3 className="text-[20px] font-semibold mt-2 tracking-[-0.02em]" style={{ color: "#151A16" }}>
              가사를 확인했다면 다음 단계
            </h3>
            <button
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] text-[13px] sm:text-sm font-semibold"
              style={{ background: "#223B2A", color: "#FFFFFF" }}
            >
              <Wand2 size={16} />
              슬라이드 편집
            </button>
          </div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-4 px-4 pointer-events-none z-50 sm:hidden">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 pointer-events-auto">
          <div className="flex justify-end">
            <button
              onClick={() => setShowMobileTools((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[11px] font-semibold"
              style={{
                background: "rgba(248,248,245,0.96)",
                border: "1px solid rgba(214,218,211,0.98)",
                color: "#253029",
                boxShadow: "0 16px 32px rgba(20,26,22,0.1)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Wand2 size={13} />
              {showMobileTools ? "도구 접기" : "가사 관리"}
            </button>
          </div>

          {showMobileTools && (
            <div
              className="rounded-[24px] px-4 py-3"
              style={{
                background: "rgba(248,248,245,0.94)",
                border: "1px solid rgba(214,218,211,0.98)",
                boxShadow: "0 20px 36px rgba(20,26,22,0.1)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex gap-2 overflow-x-auto">
                {tools.map((tool) => (
                  <button
                    key={tool}
                    className="px-3 py-2 rounded-xl text-[11px] font-semibold shrink-0"
                    style={{ background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#253029" }}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-3 rounded-[24px]"
            style={{
              background: "rgba(246,247,244,0.92)",
              border: "1px solid rgba(211,216,208,0.95)",
              boxShadow: "0 20px 40px rgba(20,26,22,0.12)",
              backdropFilter: "blur(16px)",
            }}
          >
            <button
              className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-2xl text-[12px] sm:text-sm font-semibold flex-1 xl:flex-none xl:min-w-[132px]"
              style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
            >
              <ArrowLeft size={15} />
              이전
            </button>
            <button
              className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-2xl text-[12px] sm:text-sm font-semibold text-white flex-1 xl:flex-none xl:min-w-[160px]"
              style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
            >
              <Wand2 size={15} />
              슬라이드 편집
            </button>
          </div>
        </div>
      </div>

      <div className="hidden sm:block xl:hidden fixed inset-x-0 bottom-4 px-6 pointer-events-none z-50">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 pointer-events-auto">
          <div className="flex justify-end">
            <button
              onClick={() => setShowMobileTools((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold"
              style={{
                background: "rgba(248,248,245,0.96)",
                border: "1px solid rgba(214,218,211,0.98)",
                color: "#253029",
                boxShadow: "0 16px 32px rgba(20,26,22,0.1)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Wand2 size={14} />
              {showMobileTools ? "도구 접기" : "가사 관리"}
            </button>
          </div>

          {showMobileTools && (
            <div
              className="rounded-[24px] px-5 py-3"
              style={{
                background: "rgba(248,248,245,0.94)",
                border: "1px solid rgba(214,218,211,0.98)",
                boxShadow: "0 20px 36px rgba(20,26,22,0.1)",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex gap-2 overflow-x-auto">
                {tools.map((tool) => (
                  <button
                    key={tool}
                    className="px-3 py-2 rounded-xl text-xs font-semibold shrink-0"
                    style={{ background: "#FFFFFF", border: "1px solid #CDD3CC", color: "#253029" }}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="px-5 py-3.5 flex items-center justify-between gap-3 rounded-[24px]"
            style={{
              background: "rgba(246,247,244,0.92)",
              border: "1px solid rgba(211,216,208,0.95)",
              boxShadow: "0 20px 40px rgba(20,26,22,0.12)",
              backdropFilter: "blur(16px)",
            }}
          >
            <button
              className="inline-flex min-w-0 items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold flex-1"
              style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
            >
              <ArrowLeft size={15} />
              이전
            </button>
            <button
              className="inline-flex min-w-0 items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white flex-1"
              style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
            >
              <Wand2 size={15} />
              슬라이드 편집
            </button>
          </div>
        </div>
      </div>

      <div className="hidden xl:block fixed inset-x-0 bottom-6 px-6 pointer-events-none z-50">
        <div
          className="max-w-7xl mx-auto rounded-[24px] px-6 py-4 pointer-events-auto"
          style={{
            background: "rgba(246,247,244,0.92)",
            boxShadow: "0 20px 40px rgba(20,26,22,0.12)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between">
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "#FFFFFF", color: "#1F2A22", border: "1px solid #D3D8D0" }}
          >
            <ArrowLeft size={15} />
            이전
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "#223B2A", boxShadow: "0 12px 30px rgba(34,59,42,0.16)" }}
          >
            <Wand2 size={15} />
            슬라이드 편집
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
