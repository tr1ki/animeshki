import { clearSession, getStoredUser, hydrateUser } from "./auth.js";
import { setYear } from "./ui.js";

const elements = {
  loginLink: document.getElementById("loginLink"),
  registerLink: document.getElementById("registerLink"),
  profileLink: document.getElementById("profileLink"),
  mangaManagementLink: document.getElementById("mangaManagementLink"),
  heroLoginButton: document.getElementById("heroLoginButton"),
  heroRegisterButton: document.getElementById("heroRegisterButton"),
  logoutButton: document.getElementById("logoutButton"),
  uploadAnchor: document.getElementById("uploadAnchor"),
};

const state = {
  user: getStoredUser(),
};

const updateAuthUi = () => {
  const isLoggedIn = Boolean(state.user);

  elements.logoutButton.classList.toggle("hidden", !isLoggedIn);
  elements.uploadAnchor.classList.toggle("hidden", !isLoggedIn);
  elements.mangaManagementLink.classList.toggle("hidden", !isLoggedIn);

  // Hide login and register links when user is logged in
  elements.loginLink.classList.toggle("hidden", isLoggedIn);
  elements.registerLink.classList.toggle("hidden", isLoggedIn);
  
  // Hide hero login/register buttons when user is logged in
  elements.heroLoginButton.classList.toggle("hidden", isLoggedIn);
  elements.heroRegisterButton.classList.toggle("hidden", isLoggedIn);
  
  // Show profile link only when user is logged in
  elements.profileLink.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    elements.loginLink.textContent = "Login";
    elements.loginLink.href = "./login.html";
    return;
  }

  elements.loginLink.textContent = `${state.user.username} (${state.user.role})`;
  elements.loginLink.href = "./login.html";
};

const bindEvents = () => {
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });
};

const init = async () => {
  setYear();
  bindEvents();

  try {
    state.user = await hydrateUser();
  } catch (error) {
    console.error("Auth error:", error);
  }

  updateAuthUi();
};

init();
