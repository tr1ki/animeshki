import { apiRequest, API_BASE_URL } from "./api.js";
import { getToken } from "./auth.js";

const withToken = () => {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  return token;
};

export const listApprovedManga = async () => apiRequest("/manga");

export const listMyManga = async () =>
  apiRequest("/manga/my", {
    authToken: withToken(),
  });

export const listPendingManga = async () =>
  apiRequest("/manga/pending", {
    authToken: withToken(),
  });

export const getMangaById = async (mangaId) => apiRequest(`/manga/${encodeURIComponent(mangaId)}`);

export const getMangaPages = async (mangaId) => {
  const token = getToken();

  return apiRequest(`/manga/${encodeURIComponent(mangaId)}/pages`, {
    authToken: token || null,
  });
};

export const createManga = async (payload) =>
  apiRequest("/manga", {
    method: "POST",
    authToken: withToken(),
    body: payload,
  });

export const uploadMangaCover = async (mangaId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest(`/manga/${encodeURIComponent(mangaId)}/cover`, {
    method: "POST",
    authToken: withToken(),
    formData,
  });
};

export const updateManga = async (mangaId, payload) =>
  apiRequest(`/manga/${encodeURIComponent(mangaId)}`, {
    method: "PATCH",
    authToken: withToken(),
    body: payload,
  });

export const uploadMangaFile = async (mangaId, file, pageNumber = null) => {
  const formData = new FormData();
  formData.append("file", file);

  if (pageNumber !== null) {
    formData.append("pageNumber", String(pageNumber));
  }

  return apiRequest(`/manga/${encodeURIComponent(mangaId)}/upload`, {
    method: "POST",
    authToken: withToken(),
    formData,
  });
};

export const approveManga = async (mangaId) =>
  apiRequest(`/manga/${encodeURIComponent(mangaId)}/approve`, {
    method: "PATCH",
    authToken: withToken(),
  });

export const rejectManga = async (mangaId, reason = "") =>
  apiRequest(`/manga/${encodeURIComponent(mangaId)}/reject`, {
    method: "PATCH",
    authToken: withToken(),
    body: { reason },
  });

export const deleteManga = async (mangaId) =>
  apiRequest(`/manga/${encodeURIComponent(mangaId)}`, {
    method: "DELETE",
    authToken: withToken(),
  });

export const getMangaFileUrl = (mangaId, fileId) =>
  `${API_BASE_URL}/manga/${encodeURIComponent(mangaId)}/pages?fileId=${encodeURIComponent(fileId)}`;

export const getMangaDownloadUrl = (mangaId, fileId) =>
  `${getMangaFileUrl(mangaId, fileId)}&download=true`;

export const getMangaCoverUrl = (mangaId) =>
  `${API_BASE_URL}/manga/${encodeURIComponent(mangaId)}/cover`;

export const fetchMangaFileBlob = async (
  mangaId,
  fileId,
  { download = false, requireAuth = false } = {},
) => {
  const token = getToken();
  const authToken = requireAuth ? withToken() : token || null;
  const suffix = download ? "&download=true" : "";

  return apiRequest(`/manga/${encodeURIComponent(mangaId)}/pages?fileId=${encodeURIComponent(fileId)}${suffix}`, {
    method: "GET",
    authToken,
    responseType: "blob",
    headers: {
      Accept: "*/*",
    },
  });
};
