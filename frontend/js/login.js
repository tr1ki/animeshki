import { loginUser } from "./auth.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const authFeedback = document.getElementById("authFeedback");

const showFeedback = (message, isError = false) => {
  authFeedback.textContent = message;
  authFeedback.classList.remove("hidden", "error", "success");
  authFeedback.classList.add(isError ? "error" : "success");
  
  setTimeout(() => {
    authFeedback.classList.add("hidden");
  }, 5000);
};

const setLoading = (loading) => {
  loginButton.disabled = loading;
  loginButton.textContent = loading ? "Signing In..." : "Sign In";
};

const handleLogin = async (event) => {
  event.preventDefault();
  
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showFeedback("Please fill in all fields", true);
    return;
  }

  setLoading(true);
  authFeedback.classList.add("hidden");

  try {
    const user = await loginUser({ email, password });
    showFeedback(`Welcome back ${user.username}! Redirecting to home...`);
    
    setTimeout(() => {
      window.location.href = "./index.html";
    }, 2000);
  } catch (error) {
    const message = error.message || "Login failed. Please check your credentials.";
    showFeedback(message, true);
  } finally {
    setLoading(false);
  }
};

loginForm.addEventListener("submit", handleLogin);
