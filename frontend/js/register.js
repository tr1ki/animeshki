import { apiRequest } from "./api.js";

const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
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
  registerButton.disabled = loading;
  registerButton.textContent = loading ? "Creating Account..." : "Create Account";
};

const handleRegister = async (event) => {
  event.preventDefault();
  
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!username || !email || !password) {
    showFeedback("Please fill in all fields", true);
    return;
  }

  if (password.length < 6) {
    showFeedback("Password must be at least 6 characters", true);
    return;
  }

  setLoading(true);
  authFeedback.classList.add("hidden");

  try {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: { username, email, password }
    });

    // Save session
    localStorage.setItem("animeshki_token", response.token);
    localStorage.setItem("animeshki_user", JSON.stringify(response.user));

    showFeedback(response.message || "Registration successful! Please check your email to verify your account.", false);
    
    // If email is already verified, redirect to home
    if (response.user.isEmailVerified) {
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 2000);
    } else {
      // Show email verification notice
      setTimeout(() => {
        showFeedback("Please check your email and click the verification link to activate your account.", false);
      }, 3000);
    }

  } catch (error) {
    const message = error.message || "Registration failed. Please try again.";
    showFeedback(message, true);
  } finally {
    setLoading(false);
  }
};

registerForm.addEventListener("submit", handleRegister);
