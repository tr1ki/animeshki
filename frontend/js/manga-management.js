import { clearSession, getStoredUser, hasRole, hydrateUser } from "./auth.js";
import {
  approveManga,
  deleteManga,
  getMangaCoverUrl,
  listApprovedManga,
  listMyManga,
  listPendingManga,
  rejectManga,
} from "./manga.js";
import { formatRequestError, hideFeedback, renderMangaCards, setYear, showFeedback } from "./ui.js";

const elements = {
  logoutButton: document.getElementById("logoutButton"),
  uploadLink: document.getElementById("uploadLink"),
  profileLink: document.getElementById("profileLink"),
  // Tab elements
  tabButtons: document.querySelectorAll(".tab-button"),
  tabContents: document.querySelectorAll(".tab-content"),
  // Approved Manga
  approvedGrid: document.getElementById("approvedGrid"),
  approvedFeedback: document.getElementById("approvedFeedback"),
  // My Manga
  myMangaGrid: document.getElementById("myMangaGrid"),
  myMangaFeedback: document.getElementById("myMangaFeedback"),
  // Moderation
  pendingGrid: document.getElementById("pendingGrid"),
  moderationFeedback: document.getElementById("moderationFeedback"),
};

const state = {
  user: getStoredUser(),
  currentTab: "approved",
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

const createActionButton = (label, className, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
};

const switchTab = (tabName) => {
  // Update tab buttons
  elements.tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  // Update tab contents
  elements.tabContents.forEach(content => {
    content.classList.toggle("active", content.id === `${tabName}-tab`);
    content.classList.toggle("hidden", content.id !== `${tabName}-tab`);
  });

  state.currentTab = tabName;
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
    renderMangaCards(elements.myMangaGrid, [], { emptyMessage: "Please login to view your manga." });
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
    renderMangaCards(elements.pendingGrid, [], { emptyMessage: "Access denied. Moderator/admin required." });
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

const updateAuthUi = () => {
  const isLoggedIn = Boolean(state.user);

  elements.logoutButton.classList.toggle("hidden", !isLoggedIn);
  elements.uploadLink.classList.toggle("hidden", !isLoggedIn);
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

  // Tab switching
  elements.tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
      
      // Load data for the selected tab
      switch (tabName) {
        case "approved":
          loadApprovedManga();
          break;
        case "my-manga":
          loadMyManga();
          break;
        case "moderation":
          loadPendingManga();
          break;
      }
    });
  });
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
  
  // Load initial tab data
  loadApprovedManga();

  // Preload other tabs if user is logged in
  if (state.user) {
    loadMyManga();
    if (hasRole(state.user, ["moderator", "admin"])) {
      loadPendingManga();
    }
  }
};

init();
