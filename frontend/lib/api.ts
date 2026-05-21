const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  searchLyrics: (song_title: string, title_only?: string) =>
    req<{ status: string; lyrics?: string; source?: string }>("/api/lyrics/search", {
      method: "POST",
      body: JSON.stringify({ song_title, title_only }),
    }),

  saveLyrics: (song_title: string, lyrics: string, artist?: string) =>
    req<{ status: string; id: string }>("/api/lyrics/save", {
      method: "POST",
      body: JSON.stringify({ song_title, lyrics, artist }),
    }),

  splitSlides: (lyrics: string) =>
    req<{ slides: { order: number; lyrics: string }[] }>("/api/ai/split", {
      method: "POST",
      body: JSON.stringify({ lyrics }),
    }),

  getKeywords: (lyrics: string) =>
    req<{ keywords: string[] }>("/api/ai/keywords", {
      method: "POST",
      body: JSON.stringify({ lyrics }),
    }),

  searchUnsplash: (q: string) =>
    req<{
      photos: { id: string; thumb: string; full: string; credit: string; credit_url: string }[];
    }>(`/api/images/unsplash?q=${encodeURIComponent(q)}`),

  getDefaultImages: () =>
    req<{ images: { id: string; url: string; label: string }[] }>("/api/images/default"),

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/api/images/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "업로드 실패");
    }
    return res.json();
  },

  generatePPT: (body: {
    slides: { order: number; lyrics: string }[];
    settings: object;
    session_id?: string;
    songs?: string[];
  }) =>
    req<{ job_id: string }>("/api/ppt/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getJobStatus: (job_id: string) =>
    req<{ status: string; download_url?: string; error?: string }>(
      `/api/ppt/jobs/${job_id}`
    ),
};
