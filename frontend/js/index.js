import { clearSession, getStoredUser, hasRole, hydrateUser } from "./auth.js";
import {
  approveManga,
  createManga,
  deleteManga,
  getMangaCoverUrl,
  listApprovedManga,
  listMyManga,
  listPendingManga,
  rejectManga,
  uploadMangaCover,
  uploadMangaFile,
} from "./manga.js";
import { formatRequestError, hideFeedback, renderMangaCards, setButtonLoading, setYear, showFeedback } from "./ui.js";

const elements = {
  loginLink: document.getElementById("loginLink"),
  logoutButton: document.getElementById("logoutButton"),
  uploadAnchor: document.getElementById("uploadAnchor"),
  uploadSection: document.getElementById("uploadSection"),
  uploadForm: document.getElementById("uploadForm"),
  createMangaButton: document.getElementById("createMangaButton"),
  coverInput: document.getElementById("coverInput"),
  coverUploadButton: document.getElementById("coverUploadButton"),
  pagesInput: document.getElementById("pagesInput"),
  pagesUploadButton: document.getElementById("pagesUploadButton"),
  uploadStatus: document.getElementById("uploadStatus"),
  approvedGrid: document.getElementById("approvedGrid"),
  approvedFeedback: document.getElementById("approvedFeedback"),
  myMangaSection: document.getElementById("myMangaSection"),
  myMangaGrid: document.getElementById("myMangaGrid"),
  myMangaFeedback: document.getElementById("myMangaFeedback"),
  moderationSection: document.getElementById("moderationSection"),
  pendingGrid: document.getElementById("pendingGrid"),
  moderationFeedback: document.getElementById("moderationFeedback"),
};

const state = {
  user: getStoredUser(),
  currentMangaId: null,
  coverUploaded: false,
};

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

const openManga = (mangaId) => {
  window.location.href = `./manga.html?id=${encodeURIComponent(mangaId)}`;
};

const updateAuthUi = () => {
  const isLoggedIn = Boolean(state.user);

  elements.logoutButton.classList.toggle("hidden", !isLoggedIn);
  elements.uploadAnchor.classList.toggle("hidden", !isLoggedIn);
  elements.uploadSection.classList.toggle("hidden", !isLoggedIn);
  elements.myMangaSection.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    elements.loginLink.textContent = "Login";
    elements.loginLink.href = "./login.html";
    elements.moderationSection.classList.add("hidden");
    return;
  }

  elements.loginLink.textContent = `${state.user.username} (${state.user.role})`;
  elements.loginLink.href = "./login.html";

  const canModerate = hasRole(state.user, ["moderator", "admin"]);
  elements.moderationSection.classList.toggle("hidden", !canModerate);
};

const createActionButton = (label, className, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
};

const loadApprovedManga = async () => {
  hideFeedback(elements.approvedFeedback);
  renderMangaCards(elements.approvedGrid, [], { emptyMessage: "Loading approved manga..." });

  try {
    const manga = await listApprovedManga();
    renderMangaCards(elements.approvedGrid, manga, {
      showStatus: false,
      onOpen: (item) => openManga(item._id),
      coverUrl: (item) => getMangaCoverUrl(item._id),
      emptyMessage: "No approved manga yet.",
    });
  } catch (error) {
    showFeedback(elements.approvedFeedback, formatRequestError(error), "error");
    renderMangaCards(elements.approvedGrid, [], { emptyMessage: "Failed to load manga." });
  }
};

const loadMyManga = async () => {
  if (!state.user) {
    return;
  }

  hideFeedback(elements.myMangaFeedback);
  renderMangaCards(elements.myMangaGrid, [], { emptyMessage: "Loading your manga..." });

  try {
    const myManga = await listMyManga();
    renderMangaCards(elements.myMangaGrid, myManga, {
      emptyMessage: "You have not created any manga yet.",
      coverUrl: (item) => getMangaCoverUrl(item._id),
      actionFactory: (item) => {
        const actions = [];
        const canOpen = true;
        const canDelete = ["admin", "moderator"].includes(state.user.role) || String(item.owner?._id || item.owner) === String(state.user._id || state.user.id);

        if (canOpen) {
          actions.push(
            createActionButton("Open", "button button-primary", () => {
              openManga(item._id);
            }),
          );
        }

        if (canDelete) {
          actions.push(
            createActionButton("Delete", "button button-danger", async () => {
              const confirmed = window.confirm("Are you sure you want to delete this manga?");

              if (!confirmed) {
                return;
              }

              try {
                await deleteManga(item._id);
                await Promise.all([loadMyManga(), loadApprovedManga(), loadPendingManga()]);
                showFeedback(elements.myMangaFeedback, "Deleted", "success");
              } catch (error) {
                showFeedback(elements.myMangaFeedback, getDeleteErrorMessage(error), "error");
              }
            }),
          );
        }

        return actions;
      },
    });
  } catch (error) {
    showFeedback(elements.myMangaFeedback, formatRequestError(error), "error");
    renderMangaCards(elements.myMangaGrid, [], { emptyMessage: "Could not load your manga." });
  }
};

const loadPendingManga = async () => {
  if (!state.user || !hasRole(state.user, ["moderator", "admin"])) {
    return;
  }

  hideFeedback(elements.moderationFeedback);
  renderMangaCards(elements.pendingGrid, [], { emptyMessage: "Loading pending manga..." });

  try {
    const pending = await listPendingManga();
    renderMangaCards(elements.pendingGrid, pending, {
      emptyMessage: "No pending manga right now.",
      onOpen: (item) => openManga(item._id),
      coverUrl: (item) => getMangaCoverUrl(item._id),
      actionFactory: (item) => {
        const rejectButton = createActionButton("Reject", "button button-danger", async () => {
          const reason = window.prompt("Optional rejection reason:", "") || "";

          try {
            await rejectManga(item._id, reason.trim());
            showFeedback(elements.moderationFeedback, `"${item.title}" rejected.`, "success");
            await Promise.all([loadPendingManga(), loadApprovedManga(), loadMyManga()]);
          } catch (error) {
            showFeedback(elements.moderationFeedback, formatRequestError(error), "error");
          }
        });

        const approveButton = createActionButton("Approve", "button button-secondary", async () => {
          try {
            await approveManga(item._id);
            showFeedback(elements.moderationFeedback, `"${item.title}" approved.`, "success");
            await Promise.all([loadPendingManga(), loadApprovedManga()]);
          } catch (error) {
            showFeedback(elements.moderationFeedback, formatRequestError(error), "error");
          }
        });

        return [approveButton, rejectButton];
      },
    });
  } catch (error) {
    showFeedback(elements.moderationFeedback, formatRequestError(error), "error");
    renderMangaCards(elements.pendingGrid, [], { emptyMessage: "Could not load pending queue." });
  }
};

const parseGenres = (rawValue) =>
  rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const uploadFilesSequentially = async (mangaId, files) => {
  let imagePageNumber = 1;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const isImage = file.type.startsWith("image/");
    const pageNumber = isImage ? imagePageNumber : null;

    elements.uploadStatus.textContent = `Uploading ${index + 1}/${files.length}: ${file.name}`;
    await uploadMangaFile(mangaId, file, pageNumber);

    if (isImage) {
      imagePageNumber += 1;
    }
  }
};

const resetUploadFlow = () => {
  state.currentMangaId = null;
  state.coverUploaded = false;
  elements.coverInput.value = "";
  elements.pagesInput.value = "";
  elements.coverInput.disabled = true;
  elements.coverUploadButton.disabled = true;
  elements.pagesInput.disabled = true;
  elements.pagesUploadButton.disabled = true;
  elements.uploadStatus.textContent = "";
};

const onCreateManga = async () => {
  hideFeedback(elements.myMangaFeedback);

  const payload = {
    title: document.getElementById("titleInput").value.trim(),
    genre: parseGenres(document.getElementById("genreInput").value),
    chapters: Number(document.getElementById("chaptersInput").value),
    description: document.getElementById("descriptionInput").value.trim(),
    releaseYear: Number(document.getElementById("releaseYearInput").value),
  };

  if (!payload.title || !payload.description || !payload.releaseYear || !payload.chapters || !payload.genre.length) {
    elements.uploadStatus.textContent = "Fill in all manga details before creating.";
    return;
  }

  try {
    setButtonLoading(elements.createMangaButton, true, "Creating...");
    elements.uploadStatus.textContent = "Creating manga...";

    const createdManga = await createManga(payload);
    state.currentMangaId = createdManga._id;
    elements.uploadStatus.textContent = `Created manga ${createdManga._id}. Upload the cover next.`;

    elements.coverInput.disabled = false;
    elements.coverUploadButton.disabled = false;
  } catch (error) {
    elements.uploadStatus.textContent = `Create failed: ${formatRequestError(error)}`;
  } finally {
    setButtonLoading(elements.createMangaButton, false);
  }
};

const onCoverUpload = async () => {
  if (!state.currentMangaId) {
    elements.uploadStatus.textContent = "Create manga first.";
    return;
  }

  const coverFile = elements.coverInput.files[0];

  if (!coverFile) {
    elements.uploadStatus.textContent = "Select a cover image.";
    return;
  }

  try {
    setButtonLoading(elements.coverUploadButton, true, "Uploading...");
    elements.uploadStatus.textContent = "Uploading cover...";

    await uploadMangaCover(state.currentMangaId, coverFile);
    state.coverUploaded = true;

    elements.uploadStatus.textContent = "Cover uploaded. You can now upload pages.";
    elements.pagesInput.disabled = false;
    elements.pagesUploadButton.disabled = false;

    await Promise.all([loadMyManga(), loadPendingManga(), loadApprovedManga()]);
  } catch (error) {
    elements.uploadStatus.textContent = `Cover upload failed: ${formatRequestError(error)}`;
  } finally {
    setButtonLoading(elements.coverUploadButton, false);
  }
};

const onPagesUpload = async () => {
  if (!state.currentMangaId) {
    elements.uploadStatus.textContent = "Create manga first.";
    return;
  }

  if (!state.coverUploaded) {
    elements.uploadStatus.textContent = "Upload cover before pages.";
    return;
  }

  const files = Array.from(elements.pagesInput.files || []);

  if (files.length === 0) {
    elements.uploadStatus.textContent = "Select at least one page file.";
    return;
  }

  try {
    setButtonLoading(elements.pagesUploadButton, true, "Uploading...");
    elements.uploadStatus.textContent = "Uploading pages...";

    await uploadFilesSequentially(state.currentMangaId, files);
    elements.uploadStatus.textContent = "Pages uploaded. Manga is pending moderation.";
    elements.uploadForm.reset();
    resetUploadFlow();

    await Promise.all([loadMyManga(), loadPendingManga(), loadApprovedManga()]);
  } catch (error) {
    elements.uploadStatus.textContent = `Pages upload failed: ${formatRequestError(error)}`;
  } finally {
    setButtonLoading(elements.pagesUploadButton, false);
  }
};

const bindEvents = () => {
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });

  elements.createMangaButton.addEventListener("click", onCreateManga);
  elements.coverUploadButton.addEventListener("click", onCoverUpload);
  elements.pagesUploadButton.addEventListener("click", onPagesUpload);
};

const init = async () => {
  setYear();
  bindEvents();

  try {
    state.user = await hydrateUser();
  } catch (error) {
    showFeedback(elements.approvedFeedback, formatRequestError(error), "error");
  }

  updateAuthUi();
  resetUploadFlow();
  await loadApprovedManga();

  if (state.user) {
    await Promise.all([loadMyManga(), loadPendingManga()]);
  }
};

init();
