"use client";
import { create } from "zustand";

export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string | null;
  originalLyrics: string | null;
  source: "manual" | "tavily" | "db" | null;
  loading: boolean;
  error: boolean;
  slideSplitFailed: boolean;
}

export interface Slide {
  order: number;
  lyrics: string;
  song_id?: string;
}

export interface TextPosition {
  x: number;
  y: number;
}

export interface PPTSettings {
  font_family: string;
  font_size: number;
  font_color: string;
  text_position: TextPosition;
  title_position: TextPosition;
  text_box_width: number;
  bg_type: "black" | "color" | "image";
  bg_value: string | null;
  overlay_opacity: number;
  show_title: boolean;
  merge_songs: boolean;
  export_song_id: string | null;
  separator_slides: boolean;
}

export type JobStatus = "idle" | "pending" | "processing" | "done" | "failed";

interface PPTStore {
  // Step 1
  songs: Song[];
  addSong: (title: string, artist?: string) => void;
  removeSong: (id: string) => void;
  reorderSongs: (ids: string[]) => void;
  updateSongTitle: (id: string, title: string) => void;
  setSongLyrics: (id: string, lyrics: string, source: Song["source"]) => void;
  setSongOriginalLyrics: (id: string, lyrics: string) => void;
  setSongLoading: (id: string, loading: boolean) => void;
  setSongError: (id: string, error: boolean) => void;
  setSongSlideSplitFailed: (id: string, failed: boolean) => void;

  // Step 2
  slides: Slide[];
  setSlides: (slides: Slide[]) => void;
  slidesPerSong: Record<string, Slide[]>;
  setSlidesForSong: (songId: string, slides: Slide[]) => void;
  rawText: string;
  setRawText: (text: string) => void;

  // Step 3
  settings: PPTSettings;
  updateSettings: (patch: Partial<PPTSettings>) => void;
  songSettings: Record<string, PPTSettings>;
  updateSongSettings: (songId: string, patch: Partial<PPTSettings>) => void;

  // Job
  jobId: string | null;
  jobStatus: JobStatus;
  downloadUrl: string | null;
  setJob: (id: string) => void;
  setJobStatus: (status: JobStatus, downloadUrl?: string) => void;

  reset: () => void;
}

export const defaultSettings: PPTSettings = {
  font_family: "NanumGothic",
  font_size: 48,
  font_color: "#ffffff",
  text_position: { x: 50, y: 25 },
  title_position: { x: 80, y: 75 },
  text_box_width: 95,
  bg_type: "black",
  bg_value: null,
  overlay_opacity: 0.0,
  show_title: true,
  merge_songs: true,
  export_song_id: null,
  separator_slides: true,
};

const initialState = {
  songs: [],
  slides: [],
  slidesPerSong: {},
  rawText: "",
  settings: defaultSettings,
  songSettings: {},
  jobId: null,
  jobStatus: "idle",
  downloadUrl: null,
} satisfies Pick<
  PPTStore,
  "songs" | "slides" | "slidesPerSong" | "rawText" | "settings" | "songSettings" | "jobId" | "jobStatus" | "downloadUrl"
>;

export const usePPTStore = create<PPTStore>((set) => ({
  ...initialState,

  addSong: (title, artist = "") =>
    set((s) => ({
      songs: [
        ...s.songs,
        {
          id: crypto.randomUUID(),
          title,
          artist,
          lyrics: null,
          originalLyrics: null,
          source: null,
          loading: false,
          error: false,
          slideSplitFailed: false,
        },
      ],
    })),

  removeSong: (id) =>
    set((s) => {
      const { [id]: _removedSlides, ...slidesPerSong } = s.slidesPerSong;
      const { [id]: _removedSettings, ...songSettings } = s.songSettings;
      const slides = s.slides
        .filter((slide) => slide.song_id !== id)
        .map((slide, i) => ({ ...slide, order: i + 1 }));

      return {
        songs: s.songs.filter((song) => song.id !== id),
        slides,
        slidesPerSong,
        songSettings,
        rawText: slides.map((slide) => slide.lyrics).join("\n//\n"),
      };
    }),

  reorderSongs: (ids) =>
    set((s) => ({
      songs: ids.map((id) => s.songs.find((song) => song.id === id)!),
    })),

  updateSongTitle: (id, title) =>
    set((s) => ({
      songs: s.songs.map((song) => (song.id === id ? { ...song, title } : song)),
    })),

  setSongLyrics: (id, lyrics, source) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, lyrics, source, loading: false, error: false } : song
      ),
    })),

  setSongOriginalLyrics: (id, lyrics) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, originalLyrics: lyrics } : song
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

  setSongSlideSplitFailed: (id, failed) =>
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, slideSplitFailed: failed } : song
      ),
    })),

  setSlides: (slides) => set({ slides }),

  setSlidesForSong: (songId, songSlides) =>
    set((s) => ({
      slidesPerSong: { ...s.slidesPerSong, [songId]: songSlides },
    })),

  setRawText: (rawText) => set({ rawText }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  updateSongSettings: (songId, patch) =>
    set((s) => ({
      songSettings: {
        ...s.songSettings,
        [songId]: { ...(s.songSettings[songId] ?? defaultSettings), ...patch },
      },
    })),

  setJob: (id) => set({ jobId: id, jobStatus: "pending", downloadUrl: null }),

  setJobStatus: (status, downloadUrl) =>
    set({ jobStatus: status, downloadUrl: downloadUrl ?? null }),

  reset: () =>
    set({
      ...initialState,
    }),
}));
