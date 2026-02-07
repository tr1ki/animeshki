import { clearSession, getStoredUser, hydrateUser, loginUser, registerUser } from "./auth.js";
import { hideFeedback, setButtonLoading, showFeedback } from "./ui.js";

const elements = {
  loginForm: document.getElementById("loginForm"),
  loginButton: document.getElementById("loginButton"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  registerForm: document.getElementById("registerForm"),
  registerButton: document.getElementById("registerButton"),
  registerUsername: document.getElementById("registerUsername"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  authFeedback: document.getElementById("authFeedback"),
  logoutButton: document.getElementById("logoutButton"),
};

const onLoginSubmit = async (event) => {
  event.preventDefault();
  hideFeedback(elements.authFeedback);

  try {
    setButtonLoading(elements.loginButton, true, "Signing in...");
    const user = await loginUser({
      email: elements.loginEmail.value.trim(),
      password: elements.loginPassword.value,
    });

    showFeedback(elements.authFeedback, `Welcome back, ${user.username}. Redirecting...`, "success");
    window.setTimeout(() => {
      window.location.href = "./index.html";
    }, 650);
  } catch (error) {
    showFeedback(elements.authFeedback, error.message, "error");
  } finally {
    setButtonLoading(elements.loginButton, false);
  }
};

const onRegisterSubmit = async (event) => {
  event.preventDefault();
  hideFeedback(elements.authFeedback);

  try {
    setButtonLoading(elements.registerButton, true, "Creating...");
    const user = await registerUser({
      username: elements.registerUsername.value.trim(),
      email: elements.registerEmail.value.trim(),
      password: elements.registerPassword.value,
    });

    showFeedback(elements.authFeedback, `Account created for ${user.username}. Redirecting...`, "success");
    window.setTimeout(() => {
      window.location.href = "./index.html";
    }, 650);
  } catch (error) {
    showFeedback(elements.authFeedback, error.message, "error");
  } finally {
    setButtonLoading(elements.registerButton, false);
  }
};

const initAuthState = async () => {
  const cached = getStoredUser();

  if (!cached) {
    return;
  }

  elements.logoutButton.classList.remove("hidden");
  showFeedback(elements.authFeedback, `Current session: ${cached.username} (${cached.role})`, "info");

  try {
    const user = await hydrateUser();

    if (user) {
      showFeedback(elements.authFeedback, `Current session: ${user.username} (${user.role})`, "info");
      return;
    }
  } catch (error) {
    showFeedback(elements.authFeedback, error.message, "error");
  }
};

const bindEvents = () => {
  elements.loginForm.addEventListener("submit", onLoginSubmit);
  elements.registerForm.addEventListener("submit", onRegisterSubmit);
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    hideFeedback(elements.authFeedback);
    elements.logoutButton.classList.add("hidden");
  });
};

const init = async () => {
  bindEvents();
  await initAuthState();
};

init();
