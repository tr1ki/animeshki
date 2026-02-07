import { clearSession, getStoredUser, hasRole, hydrateUser } from "./auth.js";
import {
  approveManga,
  deleteManga,
  fetchMangaFileBlob,
  getMangaById,
  getMangaDownloadUrl,
  getMangaFileUrl,
  getMangaPages,
  listMyManga,
  listPendingManga,
  rejectManga,
  updateManga,
} from "./manga.js";
import { formatRequestError, hideFeedback, setButtonLoading, showFeedback } from "./ui.js";

const elements = {
  loginLink: document.getElementById("loginLink"),
  logoutButton: document.getElementById("logoutButton"),
  mangaFeedback: document.getElementById("mangaFeedback"),
  readerFeedback: document.getElementById("readerFeedback"),
  mangaTitle: document.getElementById("mangaTitle"),
  mangaDescription: document.getElementById("mangaDescription"),
  mangaGenre: document.getElementById("mangaGenre"),
  mangaYear: document.getElementById("mangaYear"),
  mangaStatus: document.getElementById("mangaStatus"),
  mangaOwner: document.getElementById("mangaOwner"),
  editButton: document.getElementById("editButton"),
  deleteButton: document.getElementById("deleteButton"),
  approveButton: document.getElementById("approveButton"),
  rejectButton: document.getElementById("rejectButton"),
  editForm: document.getElementById("editForm"),
  editTitle: document.getElementById("editTitle"),
  editGenre: document.getElementById("editGenre"),
  editChapters: document.getElementById("editChapters"),
  editReleaseYear: document.getElementById("editReleaseYear"),
  editDescription: document.getElementById("editDescription"),
  editSubmitButton: document.getElementById("editSubmitButton"),
  readerContainer: document.getElementById("readerContainer"),
  attachmentsContainer: document.getElementById("attachmentsContainer"),
};

const state = {
  user: getStoredUser(),
  manga: null,
  mangaId: null,
  objectUrls: [],
};

const getOwnerId = (owner) => {
  if (!owner) {
    return null;
  }

  if (typeof owner === "string") {
    return owner;
  }

  return owner._id || owner.id || null;
};

const canDeleteManga = () => {
  if (!state.user || !state.manga) {
    return false;
  }

  const ownerId = getOwnerId(state.manga.owner);
  const userId = state.user._id || state.user.id;
  return ["admin", "moderator"].includes(state.user.role) || String(ownerId) === String(userId);
};

const canModerate = () => Boolean(state.user && hasRole(state.user, ["moderator", "admin"]));

const getDeleteErrorMessage = (error) => {
  if (error?.status === 403) {
    return "You don't have permission";
  }

  if (error?.status === 404) {
    return "Manga not found";
  }

  if (error?.status === 0) {
    return "Network error. Please retry.";
  }

  return formatRequestError(error);
};

const cleanupObjectUrls = () => {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
};

const updateAuthUi = () => {
  const isLoggedIn = Boolean(state.user);
  elements.logoutButton.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    elements.loginLink.textContent = "Login";
    return;
  }

  elements.loginLink.textContent = `${state.user.username} (${state.user.role})`;
};

const renderMangaMeta = (manga) => {
  elements.mangaTitle.textContent = manga.title || "Untitled manga";
  elements.mangaDescription.textContent = manga.description || "No description.";
  elements.mangaGenre.textContent = Array.isArray(manga.genre) ? manga.genre.join(", ") : manga.genre || "-";
  elements.mangaYear.textContent = String(manga.releaseYear || "-");
  elements.mangaStatus.textContent = manga.status || "approved";
  elements.mangaOwner.textContent = manga.owner?.username || "Unknown";
};

const populateEditForm = () => {
  if (!state.manga) {
    return;
  }

  elements.editTitle.value = state.manga.title || "";
  elements.editGenre.value = Array.isArray(state.manga.genre) ? state.manga.genre.join(", ") : state.manga.genre || "";
  elements.editChapters.value = state.manga.chapters || 1;
  elements.editReleaseYear.value = state.manga.releaseYear || new Date().getFullYear();
  elements.editDescription.value = state.manga.description || "";
};

const parseGenreInput = (rawValue) =>
  rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const getPrivateMangaFallback = async () => {
  const userId = state.user?._id || state.user?.id;
  const candidates = [];

  if (!userId) {
    return null;
  }

  const mine = await listMyManga();
  candidates.push(...mine);

  if (canModerate()) {
    const pending = await listPendingManga();
    candidates.push(...pending);
  }

  return candidates.find((entry) => String(entry._id) === String(state.mangaId)) || null;
};

const loadManga = async () => {
  try {
    const manga = await getMangaById(state.mangaId);
    state.manga = manga;
    return;
  } catch (error) {
    if (error.status !== 404 || !state.user) {
      throw error;
    }
  }

  const fallback = await getPrivateMangaFallback();

  if (!fallback) {
    throw new Error("404 Not Found: manga is unavailable or you do not have access.");
  }

  state.manga = fallback;
};

const createAttachmentLink = (file, requiresAuth) => {
  const link = document.createElement("a");
  link.href = getMangaDownloadUrl(state.mangaId, file.id);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = `${file.originalName} (${file.kind})`;

  if (!requiresAuth) {
    return link;
  }

  link.href = "#";
  link.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const blob = await fetchMangaFileBlob(state.mangaId, file.id, {
        download: true,
        requireAuth: true,
      });
      const objectUrl = URL.createObjectURL(blob);
      state.objectUrls.push(objectUrl);

      const tempLink = document.createElement("a");
      tempLink.href = objectUrl;
      tempLink.download = file.originalName || "download";
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    } catch (error) {
      showFeedback(elements.readerFeedback, formatRequestError(error), "error");
    }
  });

  return link;
};

const renderReader = async (files) => {
  cleanupObjectUrls();
  elements.readerContainer.innerHTML = "";
  elements.attachmentsContainer.innerHTML = "";

  if (!Array.isArray(files) || files.length === 0) {
    showFeedback(elements.readerFeedback, "This manga has no uploaded files yet.", "info");
    return;
  }

  hideFeedback(elements.readerFeedback);

  const requiresAuth = state.manga?.status !== "approved";
  const imageFiles = files.filter((file) => file.kind === "image");
  const extraFiles = files.filter((file) => file.kind !== "image");

  for (const file of imageFiles) {
    const image = document.createElement("img");
    image.className = "reader-image";
    image.loading = "lazy";
    image.alt = file.originalName || `Page ${file.pageNumber || ""}`.trim();

    if (requiresAuth) {
      const blob = await fetchMangaFileBlob(state.mangaId, file.id, { requireAuth: true });
      const objectUrl = URL.createObjectURL(blob);
      state.objectUrls.push(objectUrl);
      image.src = objectUrl;
    } else {
      image.src = getMangaFileUrl(state.mangaId, file.id);
    }

    elements.readerContainer.appendChild(image);
  }

  if (imageFiles.length === 0) {
    showFeedback(elements.readerFeedback, "No image pages found. Use attachments below.", "info");
  }

  if (extraFiles.length > 0) {
    const title = document.createElement("h3");
    title.textContent = "Attachments";
    elements.attachmentsContainer.appendChild(title);

    extraFiles.forEach((file) => {
      elements.attachmentsContainer.appendChild(createAttachmentLink(file, requiresAuth));
    });
  }
};

const loadPages = async () => {
  const pagesPayload = await getMangaPages(state.mangaId);
  await renderReader(pagesPayload.files || []);
};

const updateActions = () => {
  const canEditOrDelete = canDeleteManga();
  const canModerationActions = canModerate() && state.manga?.status === "pending";

  elements.editButton.classList.toggle("hidden", !canEditOrDelete);
  elements.deleteButton.classList.toggle("hidden", !canEditOrDelete);
  elements.approveButton.classList.toggle("hidden", !canModerationActions);
  elements.rejectButton.classList.toggle("hidden", !canModerationActions);

  if (!canEditOrDelete) {
    elements.editForm.classList.add("hidden");
  }
};

const refreshPageState = async (message = "") => {
  await loadManga();
  renderMangaMeta(state.manga);
  populateEditForm();
  updateActions();
  await loadPages();

  if (message) {
    showFeedback(elements.mangaFeedback, message, "success");
  }
};

const bindEvents = () => {
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });

  elements.editButton.addEventListener("click", () => {
    const isHidden = elements.editForm.classList.contains("hidden");
    elements.editForm.classList.toggle("hidden", !isHidden);
    if (isHidden) {
      populateEditForm();
    }
  });

  elements.editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideFeedback(elements.mangaFeedback);

    const payload = {
      title: elements.editTitle.value.trim(),
      genre: parseGenreInput(elements.editGenre.value),
      chapters: Number(elements.editChapters.value),
      releaseYear: Number(elements.editReleaseYear.value),
      description: elements.editDescription.value.trim(),
    };

    try {
      setButtonLoading(elements.editSubmitButton, true, "Saving...");
      await updateManga(state.mangaId, payload);
      await refreshPageState("Manga updated. Status reset to pending moderation.");
      elements.editForm.classList.add("hidden");
    } catch (error) {
      showFeedback(elements.mangaFeedback, formatRequestError(error), "error");
    } finally {
      setButtonLoading(elements.editSubmitButton, false);
    }
  });

  elements.deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Are you sure you want to delete this manga?");

    if (!confirmed) {
      return;
    }

    try {
      setButtonLoading(elements.deleteButton, true, "Deleting...");
      await deleteManga(state.mangaId);
      showFeedback(elements.mangaFeedback, "Deleted", "success");
      window.setTimeout(() => {
        window.location.href = "./index.html";
      }, 350);
    } catch (error) {
      showFeedback(elements.mangaFeedback, getDeleteErrorMessage(error), "error");
    } finally {
      setButtonLoading(elements.deleteButton, false);
    }
  });

  elements.approveButton.addEventListener("click", async () => {
    try {
      setButtonLoading(elements.approveButton, true, "Approving...");
      await approveManga(state.mangaId);
      await refreshPageState("Manga approved.");
    } catch (error) {
      showFeedback(elements.mangaFeedback, formatRequestError(error), "error");
    } finally {
      setButtonLoading(elements.approveButton, false);
    }
  });

  elements.rejectButton.addEventListener("click", async () => {
    const reason = window.prompt("Optional rejection reason:", "") || "";

    try {
      setButtonLoading(elements.rejectButton, true, "Rejecting...");
      await rejectManga(state.mangaId, reason.trim());
      await refreshPageState("Manga rejected.");
    } catch (error) {
      showFeedback(elements.mangaFeedback, formatRequestError(error), "error");
    } finally {
      setButtonLoading(elements.rejectButton, false);
    }
  });
};

const init = async () => {
  const params = new URLSearchParams(window.location.search);
  state.mangaId = params.get("id");

  if (!state.mangaId) {
    showFeedback(elements.mangaFeedback, "404 Not Found: missing manga id in URL.", "error");
    return;
  }

  bindEvents();

  try {
    state.user = await hydrateUser();
  } catch (error) {
    showFeedback(elements.mangaFeedback, formatRequestError(error), "error");
  }

  updateAuthUi();

  try {
    await refreshPageState();
  } catch (error) {
    showFeedback(elements.mangaFeedback, formatRequestError(error), "error");
  }
};

window.addEventListener("beforeunload", cleanupObjectUrls);

init();
