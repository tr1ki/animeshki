// Mock data arrays (easy to replace with API calls later)
const animeList = [
  {
    id: 1,
    title: "Naruto: Shippuden",
    rating: "9.1",
    img: "images/naruto.jpg",
  },
  {
    id: 2,
    title: "Dragon Ball Z",
    rating: "8.9",
    img: "images/dragonball.png",
  },
  {
    id: 3,
    title: "Bleach",
    rating: "8.7",
    img: "images/bleach.png",
  },
];

const mangaList = [
  {
    id: 1,
    title: "Hunter x Hunter",
    rating: "9.0",
    img: "images/hunter.jpg",
  },
  {
    id: 2,
    title: "Berserk",
    rating: "8.8",
    img: "images/berserk.png",
  },
  {
    id: 3,
    title: "Death Note",
    rating: "8.6",
    img: "images/tetradka.jpg",
  },
];

function createCard(item, index) {
  const card = document.createElement("article");
  card.className = "card";

  const figure = document.createElement("div");
  figure.className = "card-figure";
  const img = document.createElement("img");
  img.src = item.img;
  img.alt = item.title;
  figure.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.title;

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const rating = document.createElement("div");
  rating.className = "rating";
  rating.textContent = item.rating;

  meta.appendChild(document.createElement("div"));
  meta.appendChild(rating);
  body.appendChild(title);
  body.appendChild(meta);

  card.appendChild(figure);
  card.appendChild(body);

  // staggered animation delay
  card.style.animationDelay = index * 80 + "ms";

  return card;
}

function renderGrid(containerId, items) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = "";
  items.forEach((it, i) => {
    const c = createCard(it, i);
    grid.appendChild(c);
  });
}

// Observe sections and cards for entrance animations
function initObservers() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cards = entry.target.querySelectorAll(".card");
          cards.forEach((card, i) => {
            setTimeout(() => card.classList.add("in-view"), i * 70);
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll(".section").forEach((sec) => observer.observe(sec));
}

document.addEventListener("DOMContentLoaded", () => {
  // render
  renderGrid("animeGrid", animeList);
  renderGrid("mangaGrid", mangaList);

  // year
  document.getElementById("year").textContent = new Date().getFullYear();

  // setup observers to animate when visible
  initObservers();

  // CTA micro-interaction
  const explore = document.getElementById("exploreBtn");
  explore.addEventListener("mouseenter", () => {
    explore.style.boxShadow = "0 18px 60px rgba(124,92,255,0.2)";
    explore.style.transform = "translateY(-4px) scale(1.02)";
  });
  explore.addEventListener("mouseleave", () => {
    explore.style.boxShadow = "";
    explore.style.transform = "";
  });
});
