const STATUS_CLASSES = ["success", "error", "info"];

export const setYear = (id = "year") => {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = String(new Date().getFullYear());
  }
};

export const showFeedback = (element, message, type = "info") => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove("hidden", ...STATUS_CLASSES);
  element.classList.add(type);
};

export const hideFeedback = (element) => {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.classList.add("hidden");
  element.classList.remove(...STATUS_CLASSES);
};

export const setButtonLoading = (button, loading, loadingLabel = "Working...") => {
  if (!button) {
    return;
  }

  if (loading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }

    button.textContent = loadingLabel;
    button.disabled = true;
    return;
  }

  button.disabled = false;

  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
};

export const formatRequestError = (error, fallback = "Request failed.") => {
  if (!error) {
    return fallback;
  }

  if (error.status === 403) {
    return "403 Forbidden: you do not have permission for this action.";
  }

  if (error.status === 404) {
    return "404 Not Found: requested manga or endpoint does not exist.";
  }

  if (error.status === 0) {
    return "Network error: backend is unreachable at http://localhost:3000.";
  }

  return error.message || fallback;
};

const createStatusBadge = (status) => {
  const badge = document.createElement("span");
  badge.className = `badge ${status || ""}`;
  badge.textContent = status || "unknown";
  return badge;
};

export const renderMangaCards = (
  container,
  mangaList,
  {
    emptyMessage = "No manga available.",
    onOpen = null,
    actionFactory = null,
    coverUrl = null,
    showStatus = true,
  } = {},
) => {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(mangaList) || mangaList.length === 0) {
    const emptyPanel = document.createElement("article");
    emptyPanel.className = "panel";
    emptyPanel.textContent = emptyMessage;
    container.appendChild(emptyPanel);
    return;
  }

  mangaList.forEach((manga) => {
    const card = document.createElement("article");
    card.className = "manga-card";

    if (onOpen) {
      card.classList.add("is-clickable");
      card.tabIndex = 0;
      card.addEventListener("click", () => onOpen(manga));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(manga);
        }
      });
    }

    if (coverUrl) {
      const cover = document.createElement("img");
      cover.className = "card-cover";
      cover.loading = "lazy";
      cover.alt = `${manga.title} cover`;
      cover.src = coverUrl(manga);
      cover.addEventListener("error", () => {
        cover.classList.add("card-cover--fallback");
        cover.removeAttribute("src");
      });
      card.appendChild(cover);
    }

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = manga.title;

    const description = document.createElement("p");
    description.className = "meta-line";
    description.textContent = manga.description || "No description";

    const genre = document.createElement("p");
    genre.className = "meta-line";
    const genreText = Array.isArray(manga.genre) ? manga.genre.join(", ") : manga.genre || "-";
    genre.textContent = `Genre: ${genreText}`;

    const year = document.createElement("p");
    year.className = "meta-line";
    year.textContent = `Release Year: ${manga.releaseYear || "-"}`;

    card.append(title, description, genre, year);

    if (showStatus) {
      card.appendChild(createStatusBadge(manga.status || "pending"));
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (onOpen) {
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "button button-primary";
      openButton.textContent = "Open";
      openButton.addEventListener("click", (event) => {
        event.stopPropagation();
        onOpen(manga);
      });
      actions.appendChild(openButton);
    }

    if (actionFactory) {
      const generated = actionFactory(manga);

      if (Array.isArray(generated)) {
        generated.forEach((actionButton) => {
          if (actionButton instanceof HTMLElement) {
            actionButton.addEventListener("click", (event) => {
              event.stopPropagation();
            });
            actions.appendChild(actionButton);
          }
        });
      }
    }

    if (actions.children.length > 0) {
      card.appendChild(actions);
    }

    container.appendChild(card);
  });
};
