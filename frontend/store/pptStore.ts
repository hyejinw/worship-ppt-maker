"use client";
import { create } from "zustand";

export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string | null;
  source: "manual" | "youtube" | "db" | null;
  loading: boolean;
  error: boolean;
}

export interface Slide {
  order: number;
  lyrics: string;
}

export interface TextPosition {
  x: number;
  y: number;
}

export interface PPTSettings {
  font_family: string;
  font_size: number;
  text_position: TextPosition;
  bg_type: "black" | "color" | "image";
  bg_value: string | null;
  overlay_opacity: number;
}

export type JobStatus = "idle" | "pending" | "processing" | "done" | "failed";

interface PPTStore {
  // Step 1
  songs: Song[];
  addSong: (title: string, artist?: string) => void;
  removeSong: (id: string) => void;
  reorderSongs: (ids: string[]) => void;
  setSongLyrics: (id: string, lyrics: string, source: Song["source"]) => void;
  setSongLoading: (id: string, loading: boolean) => void;
  setSongError: (id: string, error: boolean) => void;

  // Step 2
  slides: Slide[];
  setSlides: (slides: Slide[]) => void;
  rawText: string;
  setRawText: (text: string) => void;

  // Step 3
  settings: PPTSettings;
  updateSettings: (patch: Partial<PPTSettings>) => void;

  // Job
  jobId: string | null;
  jobStatus: JobStatus;
  downloadUrl: string | null;
  setJob: (id: string) => void;
  setJobStatus: (status: JobStatus, downloadUrl?: string) => void;

  reset: () => void;
}

const defaultSettings: PPTSettings = {
  font_family: "NanumGothic",
  font_size: 36,
  text_position: { x: 50, y: 75 },
  bg_type: "black",
  bg_value: null,
  overlay_opacity: 0.0,
};

export const usePPTStore = create<PPTStore>((set) => ({
  songs: [],
  slides: [],
  rawText: "",
  settings: defaultSettings,
  jobId: null,
  jobStatus: "idle",
  downloadUrl: null,

  addSong: (title, artist = "") =>
    set((s) => ({
      songs: [
        ...s.songs,
        {
          id: crypto.randomUUID(),
          title,
          artist,
          lyrics: null,
          source: null,
          loading: false,
          error: false,
        },
      ],
    })),

  removeSong: (id) =>
    set((s) => ({ songs: s.songs.filter((song) => song.id !== id) })),

  reorderSongs: (ids) =>
    set((s) => ({
      songs: ids.map((id) => s.songs.find((song) => song.id === id)!),
    })),

  setSongLyrics: (id, lyrics, source) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, lyrics, source, loading: false, error: false } : song
      ),
    })),

  setSongLoading: (id, loading) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, loading } : song
      ),
    })),

  setSongError: (id, error) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, error, loading: false } : song
      ),
    })),

  setSlides: (slides) => set({ slides }),

  setRawText: (rawText) => set({ rawText }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  setJob: (id) => set({ jobId: id, jobStatus: "pending", downloadUrl: null }),

  setJobStatus: (status, downloadUrl) =>
    set({ jobStatus: status, downloadUrl: downloadUrl ?? null }),

  reset: () =>
    set({
      songs: [],
      slides: [],
      rawText: "",
      settings: defaultSettings,
      jobId: null,
      jobStatus: "idle",
      downloadUrl: null,
    }),
}));
