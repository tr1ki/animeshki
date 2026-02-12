import { clearSession, getStoredUser, hydrateUser } from "./auth.js";
import {
  createManga,
  uploadMangaCover,
  uploadMangaFile,
} from "./manga.js";
import { formatRequestError, hideFeedback, setButtonLoading, setYear, showFeedback } from "./ui.js";

const elements = {
  logoutButton: document.getElementById("logoutButton"),
  profileLink: document.getElementById("profileLink"),
  uploadForm: document.getElementById("uploadForm"),
  createMangaButton: document.getElementById("createMangaButton"),
  coverInput: document.getElementById("coverInput"),
  coverUploadButton: document.getElementById("coverUploadButton"),
  pagesInput: document.getElementById("pagesInput"),
  pagesUploadButton: document.getElementById("pagesUploadButton"),
  uploadStatus: document.getElementById("uploadStatus"),
};

const state = {
  user: getStoredUser(),
  currentMangaId: null,
  coverUploaded: false,
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

  } catch (error) {
    elements.uploadStatus.textContent = `Pages upload failed: ${formatRequestError(error)}`;
  } finally {
    setButtonLoading(elements.pagesUploadButton, false);
  }
};

const updateAuthUi = () => {
  const isLoggedIn = Boolean(state.user);

  elements.logoutButton.classList.toggle("hidden", !isLoggedIn);
  elements.profileLink.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    window.location.href = "./login.html";
    return;
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
    if (!state.user) {
      window.location.href = "./login.html";
      return;
    }
  } catch (error) {
    console.error("Auth error:", error);
    window.location.href = "./login.html";
    return;
  }

  updateAuthUi();
  resetUploadFlow();
};

init();
